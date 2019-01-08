### Some Best Practices for Angular Components
After working with Angular components for a while, I found a couple of things that nagged at me for a better approach:
1) Managing rxjs subscriptions - the need to unsubscribe from observables with potential for memory leaks. I found in most cases,
I can let the async pipe handle subscribing and unsubscribing for me.
2) Writing components that only render when necessary. Angular's default change detection strategy gives a great out of box
experience, but frequently causes needless re-renders.
When I first looked at the OnPush change detection strategy it looked like going from big guard rails to no guard rails. But after digging deeper, I discovered my approach for managing subscriptions (the async pipe) could also assist with OnPush change detection.  

This approach should give you the following benefits:
1) Avoid subscribes and related cleanup in the component typescript - avoid the repetive chore of unsubscribe and potential source of memory leaks/runaway observables
2) Allow components to use the OnPush detection strategy without much extra work - better UI performance
3) Enable simpler unit tests - since component methods often will use unwrapped data, mocking is easier
4) Easier to review code. If a component follows this pattern, a reviewer will not have to dig deep into subscribe callbacks and unsubscribes.

#### Review features of Async Pipe
The async pipe is going to handle most of the work after the code is setup properly. Here is a link followed by a numbered list to highlight the key features from the description: 
https://angular.io/api/common/AsyncPipe#description
1) The `async` pipe subscribes to an `Observable` or `Promise` and returns the latest value it has emitted. 
2) When a new value is emitted, the `async` pipe marks the component to be checked for changes. 
3) When the component gets destroyed, the `async` pipe unsubscribes automatically to avoid potential memory leaks.

#### How to avoid subscribe and unsubscribe.

One of the challenges of working with rxjs is the need to manage subscriptions. For those who have worked with the C/C++ languages, this is similar to the malloc/free and new/delete programming practice that is prone to memory leaks.  The lead developer of rxjs (Ben Lesh) wrote a best-practices article on subscribe/unsubscribe: [dont unsubscribe](https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87). Even with the recommended approach, you will still have to write some code: i.e. one example shows a boolean (stop$) and takeUntil() operator to indicate when to shutdown the subscription.
His examples show a best-case approach without Angular, but with Angular the async pipe can handle this for you.

Here are the recommended practices:

#### 1. Combine the observables needed in the template into a single observable returning an object

```
public viewData$: Observable<ViewData>;

this.viewData$ = combineLatest(
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
#### 2. (optional) Create an interface for the combined object. This makes it explicit what types are used by the template and gives better IDE support:
```
export interface ViewData {
    user: User;
    topics: Topic[];
    friends: User[];
}
```
#### 3. In the template have an *ngIf referencing the combined observable and pipe it to async
```
    <ng-container *ngIf="viewData$ | async as viewData">
```

This single line of markup will tell Angular via the async pipe to:
1) subscribe to your observable
2) mark the component for change detection when a new value arrives
3) handle the unsubscribe on destroy. 

There is no need to manage any of these things in typescript directly. This should make your code smaller, easier to understand,
and easier to test.

### OnPush change detection

Angular has a default change detection strategy that has to be very unassuming about what data may change - that is, it aggressively marks the component as dirty on any changes to component data. Its goal is to make writing templates easier out of the box. How it does this is beyond scope here, but essentially it uses the zone.js library to track any changes to the component data via asynchronous methods. What it cant know is if the change effected the view, so it pessimistically has to mark the component dirty. This results in re-rendering of the component and its children. 

Angular also provides the more DIY approach for change detection called OnPush. The downside is this puts all the responsibility of when to re-render the template on the developer. There are actually many ways a developer can implement a successful OnPush detection strategy - here is a partial list:
1) making a pure @input component
2) use immutable data structures
3) turn change detection on and off as needed
4) explicitly calling markForCheck() on the change detector when some value needed by the template changes.
5) using the async pipe to automatically markForCheck() anytime new values emit in an an observable

The async pipe is the easiest approach here. The async pipe will call the markForCheck() method on the changeDetector for you whenever the observable emits a new value. This is when you want the component re-render.

If you followed the steps above, all you will need to do to get the benefit of OnPush is add the following in your @component decorator:

```
@component({
    ...
    changeDetection: ChangeDetectionStrategy.OnPush
  })
```

#### Further Discussion
Question: What if I need to initialize something like a reactive form before the template renders? 
Answer: add an *ngIf as so:

```<ng-container *ngIf=“initializeFormGroup(viewData) as formGroup”>...</ng-container>```

The method takes the viewData and returns the formGroup. The idea here, in general, is to pass the viewData back to methods in the component which will keep you from having to create and subscribe to observables. It should also make it easier to unit test the component methods by mocking the view object vs spying on things that return data for observables.

Question: What if its more practical (for whatever reason) to use observable/subscribe by hand in the component?  
Answer: Combine as much into one observable and manage via the async pipe. For anything you need to hand subscribe, make sure to add code to unsubscribe and if you are using OnPush make sure to call markForCheck()

##### Answer: handle your subscribe / unsubscribe in code, but make sure to add markForCheck() when needed



Further reading:
- https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
- https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-5bac493074a4
