import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import "./session.d";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "concessionaria-default-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set to true behind HTTPS in production
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  }),
);

// Auth middleware: protect all routes except auth/* and healthz
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const isPublic =
    req.path === "/healthz" ||
    req.path.startsWith("/auth/");

  if (isPublic) {
    next();
    return;
  }

  if (!req.session.authenticated) {
    res.status(401).json({ error: "Non autenticato" });
    return;
  }

  next();
};

app.use("/api", requireAuth, router);

export default app;
