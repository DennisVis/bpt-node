/// <reference path='../typings/main.d.ts' />

import {DB} from './database';
import {Client} from 'pg';
import {Question} from '../models/question';
import * as pgPromise from 'pg-promise';

const Q = require('../node_modules/q/q');
const db = DB.getClient();

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

  private rollBack(): Promise<any> {
    return db.none('ROLLBACK');
  }

  private insertLabels(questionId: number, labels: { [key:string]:string; }): Promise<any> {
    const labelsQuery = 'INSERT INTO labels(language, value) VALUES($1, $2) RETURNING id;';
    const labelsPerQuestionQuery = 'INSERT INTO labels_per_question(question_id, label_id) VALUES($1, $2);';

    function inner(languages: string[], p: Promise<any> = Promise.resolve()): Promise<any> {
      const language = languages.shift();
      if (!language) return p;
      else {
        const value = labels[language];
        const deferred = Q.defer();

        p.then(() => {
          db.one(labelsQuery, [language, value])
            .then(res => {
              const labelId = res.id;

              deferred.resolve(
                db.none(labelsPerQuestionQuery, [questionId, labelId])
                  .catch(err => {
                    this.rollBack()
                      .then(deferred.reject(err))
                      .catch(deferred.reject(err));
                  })
              );
            })
            .catch(err => {
              this.rollBack()
                .then(deferred.reject(err))
                .catch(deferred.reject(err));
            })
        });

        return inner(languages, deferred.promise);
      }
    }

    return inner(Object.keys(labels));
  }

  all(): Result<Question[]> {
    const query = `
      SELECT questions.id, questions.name, labels.language, labels.value
      FROM questions
      LEFT OUTER JOIN labels_per_question
      ON labels_per_question.question_id = questions.id
      LEFT OUTER JOIN labels
      ON labels_per_question.label_id = labels.id`;
    return this.fetchQuestions(query);
  }

  create(question: Question): Result<Question> {
    const queryString = 'INSERT INTO questions(name) VALUES($1) RETURNING id;';
    const result = new Result<Question>();

    db.none('BEGIN')
      .then(() => {
        db.one(queryString, question.name)
          .then(res => {
            const newId = res.id;

            this.insertLabels(newId, question.labels)
              .then(() => {
                db.none('COMMIT');
                question.id = newId;
                result.success(question);
              })
              .catch(err => {
                result.fail(err);
              });
          })
          .catch(err => {
            this.rollBack();
            result.fail(err);
          });
      })
      .catch(err => {
        this.rollBack();
        result.fail(err);
      });

    return result;
  }

  read(questionId: string): Result<Question> {
    const query = `
      SELECT questions.id, questions.name, labels.language, labels.value
      FROM questions
      LEFT OUTER JOIN labels_per_question
      ON labels_per_question.question_id = questions.id
      LEFT OUTER JOIN labels
      ON labels_per_question.label_id = labels.id
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
    const result = new Result<Question>();

    db.none('BEGIN')
      .then(() => {
        db.none(updateQuery, [question.name, question.id])
          .then(() => {
            db.none(deleteLabelsQuery, question.id)
              .then(() => {
                this.insertLabels(question.id, question.labels)
                  .then(() => {
                    db.none('COMMIT');
                    result.success(question);
                  })
                  .catch(err => {
                    result.fail(err);
                  });
              })
              .catch(err => {
                this.rollBack();
                result.fail(err);
              });
          })
          .catch(err => {
            this.rollBack();
            result.fail(err);
          });
    })
    .catch(err => {
      this.rollBack();
      result.fail(err);
    });

    return result;
  }

  remove(questionId: string): Result<number> {
    const queryString = 'DELETE FROM questions WHERE id = $1;';
    const result = new Result<number>();

    db.any(queryString, questionId)
      .then(res => result.success(res.rows.length))
      .catch(err => result.fail(err));

    return result;
  }
}
