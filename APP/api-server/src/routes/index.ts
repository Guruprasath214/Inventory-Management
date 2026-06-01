import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notificationsRouter from "./notifications";
import productsRouter from "./products";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(notificationsRouter);

export default router;
