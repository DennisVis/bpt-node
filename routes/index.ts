/// <reference path='../typings/main.d.ts' />

import express = require('express');
import {Request} from "express-serve-static-core";
import {Response} from "express-serve-static-core";
import {NextFunction} from "express-serve-static-core";

var router = express.Router();

router.get('/', function(req: Request, res: Response, next: NextFunction) {
  res.send({version: '1.0.0'});
});

export = router;
