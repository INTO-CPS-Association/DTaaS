# Testing

## :question: Fundamental Concepts in Software Testing

### Definition of Software Testing

Software testing investigates the quality of a software product across
different scenarios. It can also be defined as the process of verifying and
validating that a program works as expected and meets the business and
technical requirements that guided its design and development.

### Importance of Software Testing

Testing finds defects introduced during the different development phases
and checks that the product works as expected in the expected scenarios.
A stronger test suite gives more confidence in the product. Tests also let
developers make incremental changes to the source code and check that those
changes do not break existing functionality.

### Test Driven Development (TDD)

Test Driven Development (TDD) is a development process built on repeating a
very short cycle. The developer first writes an automated test case, which
initially fails, that defines a desired improvement or new function. They
then write the minimum code needed to pass that test, and finally refactor
the new code to acceptable standards. TDD is closer to specification than to
validation: it gives a method for thinking through requirements or design
before writing functional code.

### Behaviour Driven Development (BDD)

Behaviour Driven Development (BDD) grew out of TDD. It keeps the practice of
writing tests first, but its tests describe behaviour instead of verifying a
unit of implementation. Development and management teams get a shared set
of tools and a shared process for working together. BDD usually relies on a
simple domain-specific language (DSL) with natural language constructs
(e.g., English-like sentences) that express behaviour and expected outcomes.
The Mocha and Cucumber testing libraries are built around BDD.

## :building_construction: Testing Workflow

![Test pyramid diagram](testPyramid.png)

(Ref: Ham Vocke,
[The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html))

The DTaaS project follows the test pyramid shown above. Testing of a new
feature starts with isolated tests and moves towards full integration. The
types of tests are explained below, in the order in which they should be
performed.

### [Unit Tests](https://martinfowler.com/articles/practical-test-pyramid.html#UnitTests)

Unit testing tests the individual units or components of a piece of
software. Its aim is to isolate a section of code and verify that it is
correct.

Ideally, each test case is independent of the others. Substitutes such as
method stubs, mock objects and spies help test a module in isolation.

#### Benefits of Unit Testing

* Unit tests increase confidence when changing and maintaining code. When
  good unit tests run every time the code changes, defects introduced by
  the change are found quickly.
* Code designed with fewer interdependencies, to make unit testing easier,
  suffers fewer unintended effects from changes.
* Fixing a defect found during unit testing costs less time, effort and
  money than fixing one found at a higher level.

#### Unit Tests in DTaaS

Each DTaaS component uses its own technology stack, so the unit test
packages differ between components. The client uses Jest and React Testing
Library, and the NestJS servers use Jest. The Python CLIs and libraries use
pytest. The build and test command for each project is listed in
`PROJECT.md` in the repository root.

### [Integration Tests](https://martinfowler.com/articles/practical-test-pyramid.html#IntegrationTests)

Integration testing combines individual software modules and tests them as a
group. The DTaaS project uses an
[integration server](https://github.com/INTO-CPS-Association/DTaaS/wiki/DTaaS-Integration-Server)
for both software development and integration testing.

The existing integration tests work at the component level. Integration
tests between components have not been implemented yet and are deferred to
future work.

### [End-to-End Tests](https://martinfowler.com/articles/practical-test-pyramid.html#End-to-endTests)

Testing code changes through the end-user interface shows whether the code
has the intended effect for users.
[End-to-End tests in DTaaS](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/client/test/README.md)
require a working setup.

The client has end-to-end tests written with Playwright. The library
microservice, the runner and the logger microservice have end-to-end tests
run with Jest (`yarn test:e2e`).

### Feature Tests

A software feature is a change to the system that adds new functionality or
modifies existing functionality. New features should be tested when they
are implemented, along with checks that they do not break existing
features.

The DTaaS project does not have feature tests yet.
[Cucumber](https://github.com/cucumber/cucumber-js) is planned for
implementing them.

## References

1. Arthur Hicken,
   [Shift left approach to software testing](https://www.stickyminds.com/article/shift-left-approach-software-testing)
1. Justin Searls and Kevin Buchanan,
   [Contributing Tests wiki](https://github.com/testdouble/contributing-tests/wiki).
1. This wiki has a good explanation of
   [TDD](https://github.com/testdouble/contributing-tests/wiki/Test-Driven-Development)
   and
   [test doubles](https://github.com/testdouble/contributing-tests/wiki/Test-Double).
