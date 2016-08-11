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
    .onSuccess(qs => res.json(qs))
    .onError(err => res.status(500).json(err));
});

router.post('/', function(req: Request, res: Response) {
  const question = req.body;
  dao.create(question)
    .onSuccess(id => res.status(201).json(null))
    .onError(err => res.status(500).json(err));
});

router.get('/:id', function(req: Request, res: Response) {
  const id = req.params.id;
  dao.read(id)
    .onSuccess(q => {
      if (q) res.json(q);
      else res.status(404).json(null);
    })
    .onError(err => res.status(500).json(err));
});

router.put('/:id', function(req: Request, res: Response) {
  const question = req.body;
  question.id = req.params.id;
  dao.update(question)
    .onSuccess(id => res.status(204).json(null))
    .onError(err => res.status(500).json(err));
});

router.delete('/:id', function(req: Request, res: Response) {
  const id = req.params.id;
  dao.remove(id)
    .onSuccess(ra => {
      if (ra >= 1) res.status(204).json(null);
      else res.status(400).json(null);
    })
    .onError(err => res.status(500).json(err));
});

export = router;
