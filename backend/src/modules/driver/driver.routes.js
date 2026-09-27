import express from "express";
import { createDriver } from "./driver.controller.js";

const router = express.Router();

router.post("/", createDriver);

export default router;
