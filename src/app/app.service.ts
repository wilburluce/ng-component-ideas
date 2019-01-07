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
        {id: 1, name: 'rxjs'},
        {id: 2, name: 'ngrx'},
        {id: 3, name: 'components'},
        {id: 4, name: 'router'},
        {id: 5, name: 'cli'},
        {id: 6, name: 'testing'}
      ]
    )
  }
}

export interface ViewData {
  user: User;
  topics: Topic[];
  friends: User[];
}

export interface User {
  id: number;
  name: string;
}

export interface Topic {
  id: number;
  name: string;
}
