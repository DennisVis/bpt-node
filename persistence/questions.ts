/// <reference path='../typings/main.d.ts' />

import {DB} from './database';
import {Client} from 'pg';
import {Question} from '../models/question';
import * as pgPromise from 'pg-promise';

const db = DB.client;

class Result<T> {
  private result: T = null;
  private successFunc: (t: T) => void = null;
  private error: Error = null;
  private errorFunc: (e: Error) => void = null;

  onSuccess(func: (t: T) => void): Result<T> {
    if (this.result) {
      func(this.result);
    } else {
      this.successFunc = func;
    }
    return this;
  }

  onError(func: (e: Error) => void): Result<T> {
    if (this.error) {
      func(this.error);
    } else {
      this.errorFunc = func;
    }
    return this;
  }

  success(t: T): void {
    if (this.successFunc) {
      this.successFunc(t);
    } else {
      this.result = t;
    }
  }

  fail(e: Error): void {
    if (this.errorFunc) {
      this.errorFunc(e);
    } else {
      this.error = e;
    }
  }
}

export class QuestionsDAO {
  private fetchQuestions(queryString: string, ...args: any[]): Result<Question[]> {
    const result = new Result<Question[]>();

    const questions: Question[] = [];
    const questionsMap: { [key:string]:Question; } = {};

    db.any(queryString, args)
      .then(res => {

        for (let row of res) {
          if (questionsMap[row.id]) {
            questionsMap[row.id].labels[row.language] = row.value;
          } else {
            const labels: { [key:string]:string; } = {};
            labels[row.language] = row.value;
            questionsMap[row.id] = new Question(row.id, row.name, labels);
          }
        }

        for (let id in questionsMap) {
          if (questionsMap.hasOwnProperty(id)) {
            questions.push(questionsMap[id]);
          }
        }

        result.success(questions);
      })
      .catch(err => result.fail(err));

    return result;
  }

  all(): Result<Question[]> {
    const query = `
      SELECT questions.id, questions.name, labels.language, labels.value
      FROM questions
      LEFT OUTER JOIN labels
      ON labels.question_id = questions.id`;
    return this.fetchQuestions(query);
  }

  create(question: Question): Result<Question> {
    const queryString = 'INSERT INTO questions(name) VALUES($1) RETURNING id;';
    const labelsQuery = 'INSERT INTO labels(language, value, question_id) VALUES($1, $2, $3);';
    const result = new Result<Question>();

    db.one(queryString, question.name)
      .then(data => {
        const newId = data.id;
        question.id = newId;

        db.tx(t => {
          return t.batch([
            ...Object.keys(question.labels).map(l => t.none(labelsQuery, [l, question.labels[l], newId]))
          ]);
        })
        .then(() => result.success(question))
        .catch(error => {
          this.remove(newId)
            .onSuccess(() => result.fail(error))
            .onError(err => result.fail(err));
        });
      })
      .catch(error => result.fail(error));

    return result;
  }

  read(questionId: string): Result<Question> {
    const query = `
      SELECT questions.id, questions.name, labels.language, labels.value
      FROM questions
      LEFT OUTER JOIN labels
      ON labels.question_id = questions.id
      WHERE questions.id = $1;`;
    const result = new Result<Question>();
    const arrayResult = this.fetchQuestions(query, questionId);
    arrayResult.onError(e => result.fail(e));
    arrayResult.onSuccess(qs => result.success(qs[0]));
    return result;
  }

  update(question: Question): Result<Question> {
    const updateQuery = 'UPDATE questions SET name = $1 WHERE id = $2;';
    const deleteLabelsQuery = 'DELETE FROM labels_per_question WHERE question_id = $1;';
    const updateLabelsQuery = 'INSERT INTO labels(language, value, question_id) VALUES($1, $2, $3);';
    const result = new Result<Question>();

    db.tx(t => {
      return t.batch([
        t.one(updateQuery, [question.name, question.id]),
        t.none(deleteLabelsQuery, question.id),
        ...Object.keys(question.labels).map(l => t.none(updateLabelsQuery, [l, question.labels[l], question.id]))
      ]);
    })
    .then(data => result.success(question))
    .catch(error => result.fail(error));

    return result;
  }

  remove(questionId: string): Result<number> {
    const queryString = 'DELETE FROM questions WHERE id = $1;';
    const result = new Result<number>();

    db.any(queryString, questionId)
      .then(() => result.success(1))
      .catch(err => result.fail(err));

    return result;
  }
}
