#### Some Best Practices for Angular Components
Having worked with Angular components for awhile, a couple of things stood out to me as problematic:
1) managing rxjs subscriptions (too much imperative code) and 2) writing components that only render when necessary. When I first looked at the OnPush change detection strategy it seemed like I was going from big guard rails to no guard rails - and I didnt feel like going there. Recently I discovered that something that helped me manage my subscriptions can also handle the smart change detection - the async pipe. So the following is going to go over what I have already been doing for components (combining observables and using the async pipe for subscribe/unsubscribe), but also add in the simple step to get OnPush change detection to improve component performance. Following this approach you should get the following benefits:

1) Avoid subscribes and related cleanup in the component - a frequent source of memory leaks and runaway observables
2) Allow components to use the OnPush detection strategy without much extra code
3) Enable simpler unit tests since component methods often will use unwrapped data (easier to mock objects vs observables)
4) Easier to review code. If a component follows this pattern, a reviewer will not have to dig deep into subscribe callbacks and cleanup.

Note: the Angular async pipe is going to handle most of the work for us once we get things set up. Here is a link followed by a numbered list to highlight the key features from the description: 
https://angular.io/api/common/AsyncPipe#description
1) The `async` pipe subscribes to an `Observable` or `Promise` and returns the latest value it has emitted. 
2) When a new value is emitted, the `async` pipe marks the component to be checked for changes. 
3) When the component gets destroyed, the `async` pipe unsubscribes automatically to avoid potential memory leaks.

#### How to avoid subscribe and unsubscribe.

One of the challenges of working with rxjs is the need to manage subscriptions. For those who have worked with the C/C++ languages, this is similar to the malloc/free and new/delete programming practice that is prone to memory leaks.  The lead developer of rxjs wrote a best-practices article on subscribe/unsubscribe: [dont unsubscribe](https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87). Even with best practice, there is still some degree of imperitive code management: e.g. a boolean (stop$) and takeUntil() operator to notify observables to shutdown a subscription. This is probably the best-case without Angular, but with Angular the async pipe will allow us to write more elegant code.

Here’s my approach:

### 1. Combine the observables needed in the template into a single observable returning an object

```
public viewState: ViewState;
…
this.viewState$ = combineLatest(
    this.store.selectUser(),
    this.caStore.selectTopics(),
    this.caStore.selectComments()
).pipe(
    map(([user, topics, friends]) =>
        ({user, topics, friends})
    )
);
```
### 2. (optional) Create an interface for the combined object. This makes it explicit what types are used by the template and gives better IDE support:
```
export interface ViewState {
    user: User;
    topics: Topic[];
    friends: User[];
}
```
### 3. In the template, at the outer most element you need data, have an *ngIf referencing the combined observable and pipe it to async
```
    <ng-container *ngIf="viewState$ | async as viewState">
```
This single line of markup will tell Angular
1) subscribe to your (combined) observable
2) mark the component for change detection when new values arrive
3) handle the unsubscribe on destroy. 

There is no need to manage any of these things in typescript directly. This makes your code smaller, easier to understand,
and easier to test.

### Further Discussion
You may be asking, ‘what if I need to initialize something like a reactive form before the template renders?’ Answer: add an *ngIf=“initializeFormGroup(viewState) as formGroup”
below the main *ngIf - the method takes the viewState and returns the formGroup. The idea here, in general, is to pass the viewState back to methods in the component which will keep you from having to create and subscribe to observables. It will also make it easier to unit test the component methods. 

OnPush change detection

Angular has a default change detection strategy that has to be very unassuming about what data may change and is therefore inefficient from the perspective of rendering (it frequently re-renders the template when we can visually tell its not necessary). Its goal is make writing templates easier out of the box. How it does this is beyond scope, but essentially it uses the zone.js library to track any changes to the component data. 

Angular also provides the more DIY approach for change detection called OnPush. The downside is this puts all the responsibility of when to re-render the template on the developer. There are actually many ways a developer can implement a successful OnPush strategy - here is a non-exhaustive list:
1) making a pure @input component
2) use immutable data structures
3) turn change detection on and off as needed
4) explicitly calling markForCheck() when some value needed by the template changes.
5) using the async pipe to automatically markForCheck() anytime new values emit

By far the easiest approach is to use the async pipe (assuming you set up your observable as ive described). The async pipe will call the markForCheck() method on the changeDetector for us whenever the observable we’ve subscribed to emits a new value. This is exactly when we want the template to re-render, If we’ve coalesced all the data into a single observable. 

If you followed the steps above in your component, all you will need to do to get the benefit of OnPush is the following:

#### Add changeDetectionStrategy OnPush inside component decorator object:
```
  changeDetection: ChangeDetectionStrategy.OnPush
```

Further reading:
- https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
- https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-5bac493074a4
