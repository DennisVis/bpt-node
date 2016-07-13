/// <reference path='../typings/main.d.ts' />

import express = require('express');
import {Request} from 'express-serve-static-core';
import {Response} from 'express-serve-static-core';
import {NextFunction} from 'express-serve-static-core';
import {QuestionsDAO} from "../persistence/questions";

var router = express.Router();

const dao = new QuestionsDAO();

router.get('/', function(req: Request, res: Response) {
  dao.all()
    .onSuccess(qs => res.send(qs))
    .onError(err => res.status(500).send(err));
});

router.post('/', function(req: Request, res: Response) {
  const question = req.body;
  dao.create(question)
    .onSuccess(id => res.sendStatus(201))
    .onError(err => res.status(500).send(err));
});

router.get('/:id', function(req: Request, res: Response) {
  const id = req.params.id;
  dao.read(id)
    .onSuccess(q => {
      if (q) res.send(q);
      else res.sendStatus(404);
    })
    .onError(err => res.status(500).send(err));
});

router.put('/:id', function(req: Request, res: Response) {
  const question = req.body;
  question.id = req.params.id;
  dao.update(question)
    .onSuccess(id => res.sendStatus(204))
    .onError(err => res.status(500).send(err));
});

router.delete('/:id', function(req: Request, res: Response) {
  const id = req.params.id;
  dao.remove(id)
    .onSuccess(ra => {
      if (ra >= 1) res.sendStatus(204);
      else res.sendStatus(404);
    })
    .onError(err => res.status(500).send(err));
});

export = router;
