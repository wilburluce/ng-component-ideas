### Some Best Practices for Angular Components
There's a couple things Ive found challenging when working with Angular components:
1) Managing rxjs subscriptions - need for unsubscribe and potential for memory leaks
2) Writing components that only render when necessary. Angular's default change detection strategy gives a great out of box experience, but frequently causes needless re-renders.
When I first looked at the OnPush change detection strategy it seemed like I would have to go from big guard rails to no guard rails. But after digging deeper into it, I found something I already used for subscriptions (the async pipe) could also take care of change detection. 

Using this approach you should get the following benefits:
1) Avoid subscribes and related cleanup in the component typescript - a source of memory leaks and runaway observables
2) Allow components to use the OnPush detection strategy without much extra code
3) Enable simpler unit tests since component methods often will use unwrapped data (easier to mock objects vs observables)
4) Easier to review code. If a component follows this pattern, a reviewer will not have to dig deep into subscribe callbacks and cleanup.

Note: the Angular async pipe is going to handle most of the work after the code is setup properly. Here is a link followed by a numbered list to highlight the key features from the description: 
https://angular.io/api/common/AsyncPipe#description
1) The `async` pipe subscribes to an `Observable` or `Promise` and returns the latest value it has emitted. 
2) When a new value is emitted, the `async` pipe marks the component to be checked for changes. 
3) When the component gets destroyed, the `async` pipe unsubscribes automatically to avoid potential memory leaks.

#### How to avoid subscribe and unsubscribe.

One of the challenges of working with rxjs is the need to manage subscriptions. For those who have worked with the C/C++ languages, this is similar to the malloc/free and new/delete programming practice that is prone to memory leaks.  The lead developer of rxjs wrote a best-practices article on subscribe/unsubscribe: [dont unsubscribe](https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87). Even with best practice, there is still some degree of imperative code management: e.g. a boolean (stop$) and takeUntil() operator to indicate when to shutdown a subscription.
This is probably a best-case approach without Angular,but with Angular the async pipe will you to write more elegant code.

Here’s my approach:

#### 1. Combine the observables needed in the template into a single observable returning an object

```
public viewState$: Observable<ViewState>;

this.viewState$ = combineLatest(
    this.store.selectUser(),
    this.store.selectTopics(),
    this.store.selectComments()
).pipe(
    map(([user, topics, friends]) =>
        ({user, topics, friends})
    )
);
```
The point of combining the observables is to have a single source of observable data in the template and therefore a single subscription. This will assist with OnPush change detection as well.
### 2. (optional) Create an interface for the combined object. This makes it explicit what types are used by the template and gives better IDE support:
```
export interface ViewState {
    user: User;
    topics: Topic[];
    friends: User[];
}
```
### 3. In the template have an *ngIf referencing the combined observable and pipe it to async
```
    <ng-container *ngIf="viewState$ | async as viewState">
```
This single line of markup will tell Angular via the async pipe to:
1) subscribe to your observable
2) mark the component for change detection when a new value arrives
3) handle the unsubscribe on destroy. 

There is no need to manage any of these things in typescript directly. This should make your code smaller, easier to understand,
and easier to test.

#### Further Discussion
Question: ‘what if I need to initialize something like a reactive form before the template renders?’ 
Answer: add
```<ng-container *ngIf=“initializeFormGroup(viewState) as formGroup”>...</ng-container>```

The method takes the viewState and returns the formGroup. The idea here, in general, is to pass the viewState back to methods in the component which will keep you from having to create and subscribe to observables. It should also make it easier to unit test the component methods by mocking objects vs spying on things that return data for observables. 

###OnPush change detection

Angular has a default change detection strategy that has to be very unassuming about what data may change and is therefore inefficient from the perspective of rendering. Its goal is make writing templates easier out of the box. How it does this is beyond scope, but essentially it uses the zone.js library to track any changes to the component data but it has no way to know if that change effects the view, so it has to mark the component dirty. 

Angular also provides the more DIY approach for change detection called OnPush. The downside is this puts all the responsibility of when to re-render the template on the developer. There are actually many ways a developer can implement a successful OnPush strategy - here is a non-exhaustive list:
1) making a pure @input component
2) use immutable data structures
3) turn change detection on and off as needed
4) explicitly calling markForCheck() when some value needed by the template changes.
5) using the async pipe to automatically markForCheck() anytime new values emit

The async pipe is the easiest approach here. The async pipe will call the markForCheck() method on the changeDetector for you whenever the observable emits a new value. This is exactly when you want the component re-render.

If you followed the steps above in your component, all you will need to do to get the benefit of OnPush is the following:

#### Add changeDetectionStrategy OnPush inside component decorator object:
```
  changeDetection: ChangeDetectionStrategy.OnPush
```

Further reading:
- https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
- https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-5bac493074a4
