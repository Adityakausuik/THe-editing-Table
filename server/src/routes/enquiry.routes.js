import { Router } from "express";
import { createEnquiry } from "../controllers/enquiry.controller.js";

const router = Router();

router.post("/", createEnquiry);

export default router;
