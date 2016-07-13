/// <reference path='../typings/main.d.ts' />

export class Question {
  id: number = null;
  name: string;
  labels: { [key:string]:string; };

  constructor(id: number, name: string, labels: { [key:string]:string; }) {
    this.id = id;
    this.name = name;
    this.labels = labels;
  }
}
