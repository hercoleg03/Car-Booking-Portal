import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vettureRouter from "./vetture";
import clientiRouter from "./clienti";
import prenotazioniRouter from "./prenotazioni";
import contrattiRouter from "./contratti";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vettureRouter);
router.use(clientiRouter);
router.use(prenotazioniRouter);
router.use(contrattiRouter);
router.use(dashboardRouter);

export default router;
