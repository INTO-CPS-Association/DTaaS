# Testing

## :question: Common Questions on Testing

### What is Software Testing

Software testing is a procedure to investigate the quality of a software product
in different scenarios. It can also be stated as the process of verifying and
validating that a software program or application works as expected and meets
the business and technical requirements that guided design and development.

### Why Software Testing

Software testing is required to point out the defects and errors that were made
during different development phases. Software testing also ensures that
the product under test works as expected in all different cases – stronger
the test suite, stronger is our confidence in the product that we have built.
One important benefit of software testing is that it facilitates the developers
to make incremental changes to source code and make sure that the current
changes are not breaking the functionality of the previously existing code.

### What is TDD

TDD stands for **Test Driven Development**. It is a software development process
that relies on the repetition of a very short development cycle: first
the developer writes an (initially failing) automated test case that defines
a desired improvement or new function, then produces the minimum amount of code
to pass that test, and finally refactors the new code to acceptable standards.
The goal of TDD can be viewed as specification and not validation.
In other words, it’s one way to think through your requirements or design
before your write your functional code.

### What is BDD

BDD stands for “Behaviour Driven Development”. It is a software development
process that emerged from TDD. It includes the practice of writing tests first,
but focuses on tests which describe behavior, rather than tests which test
a unit of implementation. This provides software development and management
teams with shared tools and a shared process to collaborate on
software development. BDD is largely facilitated through the use of a simple
domain-specific language (DSL) using natural language constructs
(e.g., English-like sentences) that can express the behavior and the expected
outcomes. Mocha and Cucumber testing libraries are built around
the concepts of BDD.

## :building_construction: Testing workflow

![Gitlab signin button](testPyramid.png)

(Ref: Ham Vocke,
[The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html))

We follow a testing workflow in accordance with the test pyramid diagram
given above,
starting with isolated tests and moving towards complete integration for
any new feature changes. The different types of tests (in the order that they
should be performed) are explained below:

### [Unit Tests](https://martinfowler.com/articles/practical-test-pyramid.html#UnitTests)

Unit testing is a level of software testing where individual units/ components
of a software are tested. The objective of Unit Testing is to isolate
a section of code and verify its correctness.

Ideally, each test case is independent from the others. Substitutes such as
method stubs, mock objects, and spies can be used to assist testing a module in isolation.

#### Benefits of Unit Testing

* Unit testing increases confidence in changing/ maintaining code.
  If good unit tests are written and if they are run every time
  any code is changed,
  we will be able to promptly catch any defects introduced due
  to the change.
* If codes are already made less interdependent to make unit
  testing possible,
  the unintended impact of changes to any code is less.
* The cost, in terms of time, effort and money, of fixing a
  defect detected during
  unit testing is lesser in comparison to that of defects
  detected at higher levels.

#### Unit Tests in DTaaS

Each component DTaaS project uses unique technology stack. Thus the packages
used for unit tests are different. Please check the `test/` directory of
a component to figure out the unit test packages used.

### [Integration tests](https://martinfowler.com/articles/practical-test-pyramid.html#IntegrationTests)

Integration testing is the phase in software testing in which individual
software modules are combined and tested as a group. In DTaaS, we use
an [integration server](https://github.com/INTO-CPS-Association/DTaaS/wiki/DTaaS-Integration-Server)
for software development as well as such tests.

The existing integration tests are done at the component level.
There are no integration tests between the components.
This task has been postponed to future.

### [End-to-End tests](https://martinfowler.com/articles/practical-test-pyramid.html#End-to-endTests)

Testing any code changes through the end user interface of your software
is essential to verify if your code has the desired effect for the user.
[End-to-End tests in DTaaS](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/client/test/README.md)
a functional setup. For more information
[visit here](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/client/test/README.md).

There are end-to-end tests in the DTaaS. This task has been postponed to future.

### Feature Tests

A Software feature can be defined as the changes made in the system to add
new functionality or modify the existing functionality. Each feature is said to have
a characteristics that is designed to be useful, intuitive and effective.
It is important to test a new feature when it has been added. We also need to
make sure that it does not break the functionality of already existing features.
Hence feature tests prove to be useful.

The DTaaS project does not have any feature tests yet.
[Cucumber](https://github.com/cucumber/cucumber-js) shall be used
in future to implement feature tests.

## References

Justin Searls and Kevin Buchanan,
[Contributing Tests wiki](https://github.com/testdouble/contributing-tests/wiki).
This wiki has goog explanation of
[TDD](https://github.com/testdouble/contributing-tests/wiki/Test-Driven-Development)
and
[test doubles](https://github.com/testdouble/contributing-tests/wiki/Test-Double).
