# Requirements: ICT-U Multi-Level Campus GPS

## 1. Purpose
Help students, staff and visitors find halls, rooms and restrooms on the multi-level ICT-U campus through a 3D visual navigation tool.

## 2. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | The system shall display a 3D model of the campus, including the perimeter wall, main gate, staircase, six floors and the parking lot. |
| FR-2 | The system shall let the user select a destination from a list grouped by floor. |
| FR-3 | The system shall compute a route from the Main Gate to the selected destination. |
| FR-4 | For upper floors, the route shall go up the spiral staircase and then along the corridor to the room. |
| FR-5 | The system shall show the route as a line in 3D and animate a marker and camera along it. |
| FR-6 | The system shall show step-by-step text directions for the selected route. |
| FR-7 | The user shall be able to show a single floor or all floors. |
| FR-8 | The user shall be able to reset the camera to the overview position. |
| FR-9 | The system shall expose floors, locations, routes and search through a REST API. |
| FR-10 | The system shall return a JSON error with a suitable status code for unknown resources and invalid requests. |
| FR-11 | The system shall provide a Home page presenting the project and linking to the navigation page. |
| FR-12 | The system shall provide an About Us page with a project overview and the names, roles and photos of the team members. |

## 3. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Maintainability:** the code shall follow OOP principles and established design patterns (see section 5). |
| NFR-2 | **Testability:** core logic, pages and API endpoints shall be covered by automated tests. |
| NFR-3 | **Portability:** the application shall run on Node.js 18 or newer and in a Docker container. |
| NFR-4 | **Usability:** the interface shall work in a modern desktop browser with WebGL support. |
| NFR-5 | **Automation:** every push and pull request shall be built and tested automatically (CI). |
| NFR-6 | **Delivery:** a Docker image shall be built and published automatically when tests pass on `main` (CD). |
| NFR-7 | **Extensibility:** adding a new room shall require only a new entry in the campus data, and a new kind of route shall require only a new strategy class. |

## 4. Technical requirements

- Node.js 18 or newer, and npm
- Runtime dependency: `express`
- Browser with WebGL and an internet connection (Three.js is loaded from a CDN)
- Optional: Docker, and a GitHub repository for the CI/CD pipeline

## 5. Guideline traceability

| Guideline | Where it is implemented | How it is verified |
|---|---|---|
| OOP principles | `Location`, `Room`, `Restroom`, `ParkingLot` in `server.js` | `test/server.test.js` (abstract class, factory and subclass tests) |
| Design patterns | Factory, Singleton, Repository, Strategy, Facade, Dependency Injection in `server.js` | Tests for the singleton, factory, strategy selection and injected strategy |
| API endpoints | `createApiRouter` in `server.js` (7 endpoints) | API tests for each endpoint, including 400 and 404 cases |
| CI/CD pipeline | `.github/workflows/ci.yml`, `Dockerfile` | GitHub Actions run on every push and pull request |

## 6. Assumptions and out of scope

- Room sizes and positions are estimates, not surveyed measurements.
- The parking lot is behind the school, inside the fence.
- Out of scope: user accounts, live location tracking, editing the campus through the API, a database.