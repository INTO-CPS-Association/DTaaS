# Testing

## :question: Fundamental Concepts in Software Testing

### Definition of Software Testing

Software testing is a procedure to investigate the quality of a software product
across different scenarios. It can also be defined as the process of verifying
and validating that a software program or application works as expected and
meets the business and technical requirements that guided its design and
development.

### Importance of Software Testing

Software testing is essential for identifying defects and errors introduced
during different development phases. Testing also ensures that the product
under test works as expected across expected scenarios — a stronger test suite
results in greater confidence in the product being built. One important
benefit of software testing is that it enables developers to make incremental
changes to source code while ensuring that current changes do not break the
functionality of previously existing code.

### Test Driven Development (TDD)

Test Driven Development (TDD) is a software development process that relies
on the repetition of a very short development cycle: first, the developer
writes an (initially failing) automated test case that defines a desired
improvement or new function, then produces the minimum amount of code to
pass that test, and finally refactors the new code to acceptable standards.
The goal of TDD can be viewed as specification rather than validation.
In other words, TDD provides a methodology for thinking through requirements
or design before writing functional code.

### Behaviour Driven Development (BDD)

Behaviour Driven Development (BDD) is a software development process that
emerged from TDD. It includes the practice of writing tests first, but
focuses on tests that describe behavior rather than tests that verify a
unit of implementation. This approach provides software development and
management teams with shared tools and a shared process for collaborating
on software development. BDD is largely facilitated through the use of a
simple domain-specific language (DSL) employing natural language constructs
(e.g., English-like sentences) that can express behavior and expected
outcomes. Mocha and Cucumber testing libraries are built around the
concepts of BDD.

## :building_construction: Testing Workflow

![Test pyramid diagram](testPyramid.png)

(Ref: Ham Vocke,
[The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html))

The DTaaS project follows a testing workflow in accordance with the test
pyramid diagram shown above, starting with isolated tests and moving
towards complete integration for any new feature changes. The different
types of tests, in the order that they should be performed, are explained
below:

### [Unit Tests](https://martinfowler.com/articles/practical-test-pyramid.html#UnitTests)

Unit testing is a level of software testing where individual units/ components
of a software are tested. The objective of Unit Testing is to isolate
a section of code and verify its correctness.

Ideally, each test case is independent from the others. Substitutes such as
method stubs, mock objects, and spies can be used to assist testing a module in isolation.

#### Benefits of Unit Testing

* Unit testing increases confidence in changing and maintaining code.
  When good unit tests are written and executed every time code is
  changed, defects introduced due to the change can be promptly
  identified.
* When code is designed to be less interdependent to facilitate unit
  testing, the unintended impact of changes to any code is reduced.
* The cost, in terms of time, effort, and money, of fixing a defect
  detected during unit testing is lower compared to defects detected
  at higher levels.

#### Unit Tests in DTaaS

Each component of the DTaaS project uses a unique technology stack; therefore,
the packages used for unit tests differ across components. The `test/`
directory of each component contains information about the specific unit
test packages employed.

### [Integration Tests](https://martinfowler.com/articles/practical-test-pyramid.html#IntegrationTests)

Integration testing is the phase in software testing in which individual
software modules are combined and tested as a group. The DTaaS project uses
an [integration server](https://github.com/INTO-CPS-Association/DTaaS/wiki/DTaaS-Integration-Server)
for software development as well as integration testing.

The existing integration tests are performed at the component level.
Integration tests between components have not yet been implemented;
this task has been deferred to future development.

### [End-to-End Tests](https://martinfowler.com/articles/practical-test-pyramid.html#End-to-endTests)

Testing code changes through the end-user interface of the software is
essential to verify that the code produces the desired effect for users.
[End-to-End tests in DTaaS](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/client/test/README.md)
require a functional setup.

End-to-end testing capabilities in DTaaS are currently limited; further
development of this testing layer has been deferred to future work.

### Feature Tests

A software feature can be defined as changes made to the system to add new
functionality or modify existing functionality. Each feature is characterized
by being useful, intuitive, and effective. It is important to test new
features upon implementation and to ensure that they do not break the
functionality of existing features. Feature tests are therefore essential
for maintaining software quality.

The DTaaS project does not currently include feature tests.
[Cucumber](https://github.com/cucumber/cucumber-js) is planned for use in
implementing feature tests in future development.

## References

1. Arthur Hicken,
   [Shift left approach to software testing](https://www.stickyminds.com/article/shift-left-approach-software-testing)
1. Justin Searls and Kevin Buchanan,
   [Contributing Tests wiki](https://github.com/testdouble/contributing-tests/wiki).
1. This wiki has good explanation of
   [TDD](https://github.com/testdouble/contributing-tests/wiki/Test-Driven-Development)
   and
   [test doubles](https://github.com/testdouble/contributing-tests/wiki/Test-Double).
