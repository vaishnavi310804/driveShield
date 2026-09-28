import mongoose from "mongoose";
import Incident from "./incident.model.js";
import IncidentStateTransition from "./incidentStateTransition.model.js";
import AnomalyEvent from "../anomaly/anomaly.model.js";
import Responder from "../responder/responder.model.js";
import ResponderAction from "../responder/responderAction.model.js";
import Vehicle from "../vehicle/vehicle.model.js";
import Driver from "../driver/driver.model.js";
import NotificationEvent from "../notification/notification.model.js";

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
};

const mapDriverStateAssessment = (attentionState) => {
  if (!attentionState) return undefined;
  const upper = String(attentionState).toUpperCase();
  if (["RESPONSIVE", "IMPAIRED", "UNRESPONSIVE"].includes(upper)) {
    return upper;
  }
  return undefined;
};

export const ACTIVE_INCIDENT_STATES = [
  "STATE 1: ANOMALY DETECTION",
  "STATE 2: AI VERIFICATION",
  "STATE 3: COMMUNITY MOBILIZATION",
  "STATE 4A: COMMUNITY RESPONSE",
];

export const findActiveIncident = async (driverId, vehicleId) => {
  return await Incident.findOne({
    driverId,
    vehicleId,
    currentState: { $in: ACTIVE_INCIDENT_STATES },
  }).sort({ timestamp: -1 });
};

export const processIncidentTrigger = async (anomalyEventInput) => {
  let anomalyEvent = anomalyEventInput;
  if (
    typeof anomalyEventInput === "string" ||
    (anomalyEventInput && mongoose.Types.ObjectId.isValid(anomalyEventInput) && !anomalyEventInput.type)
  ) {
    anomalyEvent = await AnomalyEvent.findById(anomalyEventInput);
  }

  if (!anomalyEvent) {
    return {
      status: 404,
      message: "Anomaly event not found.",
      data: null,
    };
  }

  if (anomalyEvent.escalationFlag !== true) {
    return {
      status: 400,
      message: "Anomaly event does not qualify for emergency escalation.",
      data: null,
    };
  }

  const locationData = anomalyEvent.context?.location || {
    speed: anomalyEvent.context?.speed,
  };
  const driverStateAssessment = mapDriverStateAssessment(
    anomalyEvent.context?.attentionState
  );

  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (e) {
    session = null;
    useTransaction = false;
  }

  try {
    const incidentData = {
      vehicleId: anomalyEvent.vehicleId,
      driverId: anomalyEvent.driverId,
      timestamp: anomalyEvent.timestamp || new Date(),
      location: locationData,
      severity: anomalyEvent.type,
      latestTelemetry: anomalyEvent.context,
      driverStateAssessment,
      currentState: "STATE 2: AI VERIFICATION",
    };

    const options = useTransaction ? { session, ordered: true } : {};

    const [incident] = await Incident.create([incidentData], options);

    const transition1Data = {
      incidentId: incident._id,
      fromState: "STATE 0: NORMAL OPERATION",
      toState: "STATE 1: ANOMALY DETECTION",
      reason: "Anomaly detected: " + anomalyEvent.type,
      timestamp: new Date(),
    };

    const transition2Data = {
      incidentId: incident._id,
      fromState: "STATE 1: ANOMALY DETECTION",
      toState: "STATE 2: AI VERIFICATION",
      reason: "Escalation threshold met (escalationFlag: true)",
      timestamp: new Date(),
    };

    const transitions = await IncidentStateTransition.create(
      [transition1Data, transition2Data],
      options
    );

    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    return {
      status: 201,
      message: "Emergency incident triggered and transitioned to AI Verification",
      data: {
        incident,
        transitions,
      },
    };
  } catch (err) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
};

export const triggerIncident = async (req, res, next) => {
  try {
    const { anomalyEventId } = req.body;

    if (!anomalyEventId) {
      return res.status(400).json({
        success: false,
        message: "Please provide anomalyEventId.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(anomalyEventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid anomalyEventId format.",
      });
    }

    const result = await processIncidentTrigger(anomalyEventId);
    return res.status(result.status).json({
      success: result.status < 400,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const verifyIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driverState } = req.body;

    if (!driverState) {
      return res.status(400).json({
        success: false,
        message: "Please provide driverState.",
      });
    }

    const allowedStates = ["RESPONSIVE", "IMPAIRED", "UNRESPONSIVE"];
    if (!allowedStates.includes(driverState)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driverState value. Must be RESPONSIVE, IMPAIRED, or UNRESPONSIVE.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format.",
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    if (incident.currentState !== "STATE 2: AI VERIFICATION") {
      return res.status(400).json({
        success: false,
        message: `Verification can only be performed when incident is in 'STATE 2: AI VERIFICATION'. Current state is '${incident.currentState}'.`,
      });
    }

    let targetState;
    let transitionReason;

    if (driverState === "RESPONSIVE") {
      targetState = "STATE 0: NORMAL OPERATION";
      transitionReason = "AI verification received a responsive driver result; incident downgraded to normal operation.";
    } else if (driverState === "IMPAIRED") {
      targetState = "STATE 3: COMMUNITY MOBILIZATION";
      transitionReason = "AI verification classified the driver as impaired; incident escalated to community mobilization.";
    } else if (driverState === "UNRESPONSIVE") {
      targetState = "STATE 3: COMMUNITY MOBILIZATION";
      transitionReason = "AI verification classified the driver as unresponsive; incident escalated to community mobilization.";
    }

    let session = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      session = null;
      useTransaction = false;
    }

    try {
      const options = useTransaction ? { session } : {};

      incident.driverStateAssessment = driverState;
      incident.currentState = targetState;
      await incident.save(options);

      const transitionData = {
        incidentId: incident._id,
        fromState: "STATE 2: AI VERIFICATION",
        toState: targetState,
        reason: transitionReason,
        timestamp: new Date(),
      };

      const [transition] = await IncidentStateTransition.create([transitionData], options);

      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      return res.status(200).json({
        success: true,
        message: `Incident verification processed successfully. State updated to '${targetState}'.`,
        data: {
          incident,
          transition,
        },
      });
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const mobilizeIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format.",
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    if (incident.currentState !== "STATE 3: COMMUNITY MOBILIZATION") {
      return res.status(400).json({
        success: false,
        message: `Mobilization can only be performed when incident is in 'STATE 3: COMMUNITY MOBILIZATION'. Current state is '${incident.currentState}'.`,
      });
    }

    const lat = incident.location?.latitude;
    const lon = incident.location?.longitude;

    if (lat === undefined || lat === null || isNaN(Number(lat)) || lon === undefined || lon === null || isNaN(Number(lon))) {
      return res.status(400).json({
        success: false,
        message: "Incident location coordinates (latitude/longitude) are missing or invalid.",
      });
    }

    const targetLat = Number(lat);
    const targetLon = Number(lon);

    const activeResponders = await Responder.find({ isActive: true });

    const eligibleResponders = activeResponders.map((responder) => {
      const obj = responder.toObject();
      const distanceKm = calculateDistanceKm(
        targetLat,
        targetLon,
        responder.latitude,
        responder.longitude
      );
      return {
        ...obj,
        distanceKm,
      };
    });

    eligibleResponders.sort((a, b) => a.distanceKm - b.distanceKm);

    let session = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      session = null;
      useTransaction = false;
    }

    try {
      const options = useTransaction ? { session } : {};

      if (eligibleResponders.length === 0) {
        incident.currentState = "STATE 4B: AUTHORITY / EMERGENCY ESCALATION";
        incident.communityResponseStatus = "NO_COMMUNITY_RESPONDER_AVAILABLE";
        await incident.save(options);

        const transitionData = {
          incidentId: incident._id,
          fromState: "STATE 3: COMMUNITY MOBILIZATION",
          toState: "STATE 4B: AUTHORITY / EMERGENCY ESCALATION",
          reason: "Community mobilization initiated, but no active community responders were available. Escalated to authority/emergency.",
          timestamp: new Date(),
        };

        const [transition] = await IncidentStateTransition.create([transitionData], options);

        if (useTransaction && session) {
          await session.commitTransaction();
          session.endSession();
        }

        return res.status(200).json({
          success: true,
          message: "No active community responders available. Escalated to Authority/Emergency.",
          data: {
            incident,
            transition,
            responders: [],
            simulatedNotificationSent: false,
          },
        });
      }

      incident.communityResponseStatus = "MOBILIZATION_STARTED";
      await incident.save(options);

      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      return res.status(200).json({
        success: true,
        message: `Community mobilization initiated. Simulated notification dispatched to ${eligibleResponders.length} active responder(s).`,
        data: {
          incident,
          count: eligibleResponders.length,
          responders: eligibleResponders,
          simulatedNotificationSent: true,
        },
      });
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const acceptIncidentByResponder = async (req, res, next) => {
  try {
    const { id, responderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(responderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid responder ID format.",
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    const responder = await Responder.findById(responderId);

    if (!responder) {
      return res.status(404).json({
        success: false,
        message: "Responder not found.",
      });
    }

    if (incident.currentState !== "STATE 3: COMMUNITY MOBILIZATION") {
      return res.status(400).json({
        success: false,
        message: `Responder acceptance can only be processed when incident is in 'STATE 3: COMMUNITY MOBILIZATION'. Current state is '${incident.currentState}'.`,
      });
    }

    if (responder.isActive !== true) {
      return res.status(400).json({
        success: false,
        message: "Responder is not active and cannot accept incidents.",
      });
    }

    let session = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      session = null;
      useTransaction = false;
    }

    try {
      const options = useTransaction ? { session } : {};

      incident.currentState = "STATE 4A: COMMUNITY RESPONSE";
      incident.communityResponseStatus = `ACCEPTED_BY_${responder.name.toUpperCase().replace(/\s+/g, "_")}`;
      await incident.save(options);

      const actionData = {
        incidentId: incident._id,
        responderId: responder._id,
        action: "ACCEPTED",
        timestamp: new Date(),
      };

      const [responderAction] = await ResponderAction.create([actionData], options);

      const transitionData = {
        incidentId: incident._id,
        fromState: "STATE 3: COMMUNITY MOBILIZATION",
        toState: "STATE 4A: COMMUNITY RESPONSE",
        reason: `Responder ${responder.name} accepted the emergency incident notification.`,
        timestamp: new Date(),
      };

      const [transition] = await IncidentStateTransition.create([transitionData], options);

      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      return res.status(200).json({
        success: true,
        message: `Incident accepted by responder '${responder.name}'. Transitioned to Community Response (STATE 4A).`,
        data: {
          incident,
          responderAction,
          transition,
        },
      });
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const processAuthorityEscalationHelper = async ({
  incident,
  fromState,
  transitionReason,
  communityResponseStatus,
  sessionOptions,
}) => {
  const vehicle = await Vehicle.findById(incident.vehicleId);
  const driver = await Driver.findById(incident.driverId);

  const vehicleIdentification = vehicle
    ? {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.licensePlate,
        ...(vehicle.vin ? { vin: vehicle.vin } : {}),
      }
    : undefined;

  const driverName = driver?.name || undefined;

  const driverInformation = driver
    ? {
        ...(driverName ? { name: driverName } : {}),
        licenseNumber: driver.licenseNumber,
        phone: driver.phone,
        emergencyContact: driver.emergencyContact || undefined,
      }
    : undefined;

  const latestVehicleTelemetry = incident.latestTelemetry
    ? {
        speed:
          incident.latestTelemetry.vehicleData?.speed ??
          incident.latestTelemetry.speed ??
          incident.location?.speed,
        rpm:
          incident.latestTelemetry.vehicleData?.rpm ??
          incident.latestTelemetry.rpm,
        coolantTemp:
          incident.latestTelemetry.vehicleData?.coolantTemp ??
          incident.latestTelemetry.coolantTemp,
        batteryVoltage:
          incident.latestTelemetry.vehicleData?.batteryVoltage ??
          incident.latestTelemetry.batteryVoltage,
      }
    : undefined;

  const emergencyPayload = {
    incidentId: incident._id,
    timestamp: new Date(),
    location: incident.location,
    severity: incident.severity,
    vehicleIdentification,
    driverInformation,
    latestVehicleTelemetry,
    driverStateAssessment: incident.driverStateAssessment,
    communityResponseStatus:
      communityResponseStatus ||
      incident.communityResponseStatus ||
      "AUTHORITY_ESCALATION_INITIATED",
  };

  const simulatedDispatchResult = {
    dispatchId:
      "DISPATCH-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    status: "CONFIRMED",
    timestamp: new Date(),
  };

  const authorityNotificationData = {
    incidentId: incident._id,
    recipientType: "AUTHORITY",
    recipientDetail: "SIMULATED_EMERGENCY_AUTHORITY",
    payload: {
      emergencyPayload,
      dispatchResult: simulatedDispatchResult,
    },
    status: "SENT",
    timestamp: new Date(),
  };

  const notificationDocs = [authorityNotificationData];

  if (driver?.emergencyContact?.phone || driver?.emergencyContact?.name) {
    const contactDetail =
      driver.emergencyContact.phone || driver.emergencyContact.name;
    const emergencyContactNotificationData = {
      incidentId: incident._id,
      recipientType: "EMERGENCY_CONTACT",
      recipientDetail: contactDetail,
      payload: {
        driverName: driverName || "Driver",
        location: incident.location,
        severity: incident.severity,
        emergencyStatus: "STATE 4B: AUTHORITY / EMERGENCY ESCALATION",
        emergencyContact: driver.emergencyContact,
        message: `Emergency Alert: Incident detected for ${
          driverName || "driver"
        } (Severity: ${incident.severity}). Location: lat ${
          incident.location?.latitude
        }, lon ${
          incident.location?.longitude
        }. Emergency services notified.`,
      },
      status: "SENT",
      timestamp: new Date(),
    };
    notificationDocs.push(emergencyContactNotificationData);
  }

  const createdNotifications = await NotificationEvent.create(
    notificationDocs,
    sessionOptions
  );

  incident.currentState = "STATE 4B: AUTHORITY / EMERGENCY ESCALATION";
  incident.communityResponseStatus =
    communityResponseStatus || "ESCALATED_TO_AUTHORITY";
  await incident.save(sessionOptions);

  const transitionData = {
    incidentId: incident._id,
    fromState: fromState,
    toState: "STATE 4B: AUTHORITY / EMERGENCY ESCALATION",
    reason:
      transitionReason ||
      `Emergency incident escalated from ${fromState} to Authority / Emergency Escalation.`,
    timestamp: new Date(),
  };

  const [transition] = await IncidentStateTransition.create(
    [transitionData],
    sessionOptions
  );

  return {
    emergencyPayload,
    simulatedDispatchResult,
    createdNotifications,
    transition,
  };
};

export const responderUnableToAssist = async (req, res, next) => {
  try {
    const { id, responderId } = req.params;
    const { reason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(responderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid responder ID format.",
      });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    const responder = await Responder.findById(responderId);
    if (!responder) {
      return res.status(404).json({
        success: false,
        message: "Responder not found.",
      });
    }

    if (incident.currentState === "STATE 4B: AUTHORITY / EMERGENCY ESCALATION") {
      return res.status(400).json({
        success: false,
        message: "Incident is already in 'STATE 4B: AUTHORITY / EMERGENCY ESCALATION'. Escalation cannot be repeated.",
      });
    }

    if (incident.currentState !== "STATE 4A: COMMUNITY RESPONSE") {
      return res.status(400).json({
        success: false,
        message: `Responder inability to assist can only be processed when incident is in 'STATE 4A: COMMUNITY RESPONSE'. Current state is '${incident.currentState}'.`,
      });
    }

    const acceptedAction = await ResponderAction.findOne({
      incidentId: incident._id,
      responderId: responder._id,
      action: "ACCEPTED",
    });

    if (!acceptedAction) {
      return res.status(400).json({
        success: false,
        message: "Responder is not registered as an accepted responder for this incident.",
      });
    }

    let session = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      session = null;
      useTransaction = false;
    }

    try {
      const options = useTransaction ? { session, ordered: true } : {};

      const unableReason = reason || "Responder unable to assist";
      const actionData = {
        incidentId: incident._id,
        responderId: responder._id,
        action: "UNABLE_TO_ASSIST",
        reason: unableReason,
        timestamp: new Date(),
      };
      const [responderAction] = await ResponderAction.create([actionData], options);

      const escalationResult = await processAuthorityEscalationHelper({
        incident,
        fromState: "STATE 4A: COMMUNITY RESPONSE",
        transitionReason: "RESPONDER_UNABLE_TO_ASSIST",
        communityResponseStatus: "RESPONDER_UNABLE_TO_ASSIST",
        sessionOptions: options,
      });

      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      return res.status(200).json({
        success: true,
        message: `Responder '${responder.name}' indicated inability to assist. Escalated to Authority / Emergency Escalation (STATE 4B).`,
        data: {
          incident,
          responderAction,
          transition: escalationResult.transition,
          notificationEvents: escalationResult.createdNotifications,
          dispatchResult: escalationResult.simulatedDispatchResult,
        },
      });
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const escalateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format.",
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    if (incident.currentState === "STATE 4B: AUTHORITY / EMERGENCY ESCALATION") {
      return res.status(400).json({
        success: false,
        message: "Incident is already in 'STATE 4B: AUTHORITY / EMERGENCY ESCALATION'. Escalation cannot be repeated.",
      });
    }

    const allowedSourceStates = [
      "STATE 1: ANOMALY DETECTION",
      "STATE 3: COMMUNITY MOBILIZATION",
      "STATE 4A: COMMUNITY RESPONSE",
    ];

    if (!allowedSourceStates.includes(incident.currentState)) {
      return res.status(400).json({
        success: false,
        message: `Escalation to Authority can only be performed from STATE 1, STATE 3, or STATE 4A. Current state is '${incident.currentState}'.`,
      });
    }

    const fromState = incident.currentState;

    let session = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      session = null;
      useTransaction = false;
    }

    try {
      const options = useTransaction ? { session, ordered: true } : {};

      const escalationResult = await processAuthorityEscalationHelper({
        incident,
        fromState,
        transitionReason: `Emergency incident escalated from ${fromState} to Authority / Emergency Escalation.`,
        communityResponseStatus: "ESCALATED_TO_AUTHORITY",
        sessionOptions: options,
      });

      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      return res.status(200).json({
        success: true,
        message: "Incident successfully escalated to Authority / Emergency Escalation (STATE 4B).",
        data: {
          incident,
          emergencyPayload: escalationResult.emergencyPayload,
          dispatchResult: escalationResult.simulatedDispatchResult,
          notificationEvents: escalationResult.createdNotifications,
          transition: escalationResult.transition,
        },
      });
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const getIncidentTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID format.",
      });
    }

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    if (req.user) {
      const authDriver = await Driver.findOne({ userId: req.user._id });
      const isOwner =
        String(incident.driverId) === String(req.user._id) ||
        (authDriver && String(incident.driverId) === String(authDriver._id));

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Cannot access timeline for another driver's incident.",
        });
      }
    }

    const [transitions, responderActions, notifications, anomalyEvents] =
      await Promise.all([
        IncidentStateTransition.find({ incidentId: incident._id }),
        ResponderAction.find({ incidentId: incident._id }),
        NotificationEvent.find({ incidentId: incident._id }),
        AnomalyEvent.find({
          driverId: incident.driverId,
          vehicleId: incident.vehicleId,
          timestamp: incident.timestamp,
        }),
      ]);

    const mappedEvents = [];

    anomalyEvents.forEach((anomaly) => {
      mappedEvents.push({
        timestamp: anomaly.timestamp || anomaly.createdAt,
        eventType: "ANOMALY",
        description: "Anomaly detected.",
        details: {
          type: anomaly.type,
          deviationScore: anomaly.deviationScore,
          anomalyConfidence: anomaly.anomalyConfidence,
          escalationFlag: anomaly.escalationFlag,
          timestamp: anomaly.timestamp,
          context: anomaly.context,
        },
      });
    });

    transitions.forEach((transition) => {
      mappedEvents.push({
        timestamp: transition.timestamp || transition.createdAt,
        eventType: "STATE_TRANSITION",
        description:
          transition.reason ||
          `Transition from ${transition.fromState} to ${transition.toState}`,
        details: {
          fromState: transition.fromState,
          toState: transition.toState,
          incidentId: transition.incidentId,
        },
      });
    });

    responderActions.forEach((action) => {
      let desc = `Responder action: ${action.action}`;
      if (action.action === "ACCEPTED") {
        desc = "Responder accepted the incident.";
      } else if (action.action === "ENROUTE") {
        desc = "Responder is en route to the incident.";
      }

      mappedEvents.push({
        timestamp: action.timestamp || action.createdAt,
        eventType: "RESPONDER_ACTION",
        description: desc,
        details: {
          responderId: action.responderId,
          action: action.action,
          incidentId: action.incidentId,
        },
      });
    });

    notifications.forEach((notif) => {
      let desc = `${notif.recipientType} notification sent.`;
      if (notif.recipientType === "AUTHORITY") {
        desc = "Authority notification sent.";
      } else if (notif.recipientType === "EMERGENCY_CONTACT") {
        desc = "Emergency contact notification sent.";
      }

      mappedEvents.push({
        timestamp: notif.timestamp || notif.createdAt,
        eventType: "NOTIFICATION",
        description: desc,
        details: {
          recipientType: notif.recipientType,
          recipientDetail: notif.recipientDetail,
          status: notif.status,
          incidentId: notif.incidentId,
          payload: notif.payload,
        },
      });
    });

    mappedEvents.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      if (a.eventType !== b.eventType) {
        return a.eventType.localeCompare(b.eventType);
      }
      return JSON.stringify(a.details).localeCompare(JSON.stringify(b.details));
    });

    return res.status(200).json({
      success: true,
      count: mappedEvents.length,
      data: mappedEvents,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const getIncidents = async (req, res, next) => {
  try {
    let { driverId, vehicleId, limit } = req.query;

    if (req.user) {
      const authDriver = await Driver.findOne({ userId: req.user._id });
      if (req.query.driverId) {
        if (
          String(req.query.driverId) !== String(req.user._id) &&
          (!authDriver || String(req.query.driverId) !== String(authDriver._id))
        ) {
          return res.status(403).json({
            success: false,
            message: "Cannot access incident records of another driver.",
          });
        }
      } else {
        const allowedDriverIds = [req.user._id];
        if (authDriver) allowedDriverIds.push(authDriver._id);
        driverId = { $in: allowedDriverIds };
      }
    } else if (!driverId) {
      driverId = "6ab9260a382dfb48c9712dc0";
    }

    if (driverId && typeof driverId === "string" && !mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format.",
      });
    }

    if (vehicleId && !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID format.",
      });
    }

    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 20;
    } else if (parsedLimit > 50) {
      parsedLimit = 50;
    }

    const query = {};
    if (driverId) query.driverId = driverId;
    if (vehicleId) query.vehicleId = vehicleId;

    const incidents = await Incident.find(query)
      .sort({ timestamp: -1 })
      .limit(parsedLimit);

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });

  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

