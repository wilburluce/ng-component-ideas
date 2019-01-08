### Some Best Practices for Angular Components
After working with Angular components for a while, I found a couple of things that demanded a better approach:
1) Managing rxjs subscriptions - the need to unsubscribe from observables with potential for memory leaks. I found in most cases,
the [async pipe](https://angular.io/api/common/AsyncPipe#description) can handle subscribing and unsubscribing for me.
2) Writing components that only render when necessary. Angular's default change detection strategy gives a great out of box
experience, but frequently causes needless re-renders.
When I first looked at the OnPush change detection strategy it looked like going from big guard rails to no guard rails.
But after digging deeper, I discovered my go-to approach for managing subscriptions (the async pipe) could also assist with OnPush change detection.  

In addition to the benefits of using the async pipe - which is nothing really new, I use a simple concept that has made my code simpler: I combine all observables used in the template into a single observable. This frequently blah blah
1) Enable simpler unit tests - since component methods often will use unwrapped data, mocking is easier
2) Easier to review code. If a component follows this pattern, a reviewer will not have to dig deep into subscribe callbacks and unsubscribes.

### How to avoid subscribe and unsubscribe.

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

This single line of markup will tell Angular to:
1) subscribe to your observable
2) handle the unsubscribe on destroy. 

There is no need to manage either of these things in typescript directly. This should make your code smaller, easier to understand,
and easier to test.

### OnPush change detection

Angular has a default change detection strategy that has to be very unassuming about what data may change - that is, it aggressively marks the component as dirty on any changes to component data. Its goal is to make writing templates easier out of the box. How it does this is beyond scope here, but essentially it uses the zone.js library to track any changes to the component data via asynchronous methods. What it cant know is if the change effected the view, so it pessimistically has to mark the component dirty. This results in re-rendering of the component and its children. 

Angular also provides the more DIY approach for change detection called OnPush. The downside is this puts all the responsibility of when to re-render the template on the developer. There are actually many ways a developer can implement a successful OnPush detection strategy - here is a partial list:
1) making a pure @input component
2) use immutable data structures
3) turn change detection on and off as needed
4) explicitly calling markForCheck() on the change detector when some value needed by the template changes.
5) using the async pipe to automatically markForCheck() anytime new values emit in an an observable

The async pipe is the easiest approach here. The async pipe will call the markForCheck() method on the changeDetector for you whenever the observable emits a new value. This is when you want the component to re-render.

If you followed the steps above, all you will need to do to get the benefit of OnPush is add the following in your @component decorator:

```
@component({
    ...
    changeDetection: ChangeDetectionStrategy.OnPush
  })
```
So at this point, you should have a safe and efficient component using a minimal amount of code.

### Further Discussion
Question: What if I need to initialize something like a reactive form before the template renders? 
Answer: add an *ngIf as so:

```<ng-container *ngIf=“initializeFormGroup(viewData) as formGroup”>...</ng-container>```

The method takes the viewData and returns the formGroup. The idea here, in general, is to pass the viewData back to methods in the component which will keep you from having to create and subscribe to observables. It should also make it easier to unit test the component methods by mocking the view object vs spying on things that return data for observables.

Question: What if its more practical (for whatever reason) to subscribe by hand in the component?  
Answer: Combine as many observable sources into one observable and manage that via the async pipe. For anything you need to hand subscribe, make sure to add code to unsubscribe and _if you are using OnPush_ make sure to call markForCheck() if an emitted value impacts the view.

```
constructor(ChangeDetectorRef cdRef)
...
$obs.subscribe(data => {
    this.usedInTemplate = data;
    cdRef.markForCheck();
})
```

Further reading:
- https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
- https://netbasal.com/a-comprehensive-guide-to-angular-onpush-change-detection-strategy-5bac493074a4
