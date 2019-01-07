import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable()
export class DataService {
  public selectUser(): Observable<User> {
    return of({id: 1, name: 'Mark'});
  }

  public selectFriends(): Observable<User[]> {
    return of(
      [
        {id: 2, name: 'Fred'},
        {id: 3, name: 'Chuck'}
      ]);
  }

  public selectTopics(): Observable<Topic[]> {
    return of(
      [
        {name: 'rxjs'},
        {name: 'ngrx'},
        {name: 'components'},
        {name: 'router'},
        {name: 'cli'},
        {name: 'testing'}
      ]
    )
  }
}



export interface ViewStatex {
  user: User;
  topics: Topic[];
  friends: User[];
}

export interface User {
  id: number;
  name: string;
}

export interface Topic {
  name: string;
}
