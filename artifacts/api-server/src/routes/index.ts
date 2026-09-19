import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(accountRouter);

export default router;
