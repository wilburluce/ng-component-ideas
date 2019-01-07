import { Component, Injectable, OnInit } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService, ViewStatex } from './app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public viewState$: Observable<ViewStatex>;

  constructor(public dataSvc: DataService) {}

  ngOnInit() {

    this.viewState$ = combineLatest(
      this.dataSvc.selectUser(),
      this.dataSvc.selectTopics(),
      this.dataSvc.selectFriends()
    ).pipe(
      map(([user, topics, friends]) =>
        ({user, topics, friends})
      )
    );
  }
}



