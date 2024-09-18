# Contributing

Thanks for your interest in contributing to Referee FYI. Read this guide for an
overview of how to get started! For an overview of the project, see the
[`README`](https://github.com/brenapp/referee.fyi)

## Design Principles & Goals

Referee FYI is designed to be a progressive web app that is primarily intended
to be used for mobile devices. We anticipate that many of the referees using
this application will be situated in facilities with poor internet connections.
We also anticipate that some users may need to install and join a share instance
quickly after learning about the application for the first time that day. These
constraints drive a lot of our technical decisions:

1. Referee FYI should be available from the web, and quick to install even on
   bad internet connections. We should strive for the entire application to be
   less than 5 MB, so it can be easily installed from poor internet during an
   event.
2. Once installed, Referee FYI should make no assumptions about network
   connectivity. Obviously, we depend on the Internet for RobotEvents data and
   for the sharing server (if used). But the user should be able to perform all
   actions, even when offline, and the application should reconcile those
   changes when connectivity is restored. This includes strong caching for
   RobotEvents data.
3. Referee FYI should design first for small, touch friendly devices, even at
   the expense of the desktop.
4. Referee FYI should protect incident data very carefully. The safest place
   incident data can be is on the user's device.
5. Sharing content between devices must be quick, reliable, and automatic. Users
   must trust that they are seeing the entire set of data at all times, whenever
   possible.

### Non Goals

1. Referee FYI does not replace Tournament Manager, RobotEvents, or TM Mobile.
   We are aiming to replace the paper anomaly log. 
2. Data should be isolated between events. We should not present information
   about a team that comes from outside the event we are running now, as this
   can reinforce fairness issues; every event should be a clean slate.

## Technologies

This project makes use of the following technologies extensively.

- React 
- Tailwind
- Tanstack Query
- Vite
- Cloudflare Workers

## App Structure

The general structure of Referee FYI is motivated by creating a Progressive Web
App that end users can add to their home screen on their phone. The client
application is a static react app hosted using Cloudflare Pages to provide
low-latency throughout the world. The sharing service make use of Cloudflare
Workers to provide efficient, edge web services to reduce latency between mobile
devices and the share server.

> Edge Services. Cloudflare Workers is really well adapted to this project
> because the vast majority of cloud interactions we care about (sync actions
> with the sync service) happen between devices that all are located in the same
> facility. Since Cloudflare distributes the sync worker across all of its
> datacenters, it can provide low latency (>20ms TTFB) communication around the
> world, and requires little synchronization between data centers.

### Folder Structure

```
lib/                # Libraries shared between client and server
   consistency/     # Libraries to support Conflict-Free Replicated Data Types
   share/           # Common types and libraries used when sharing content 
src/                # Contains App Client Code
   components/      # Common UI components shared between multiple routes
   migrations/      # Code to migrate the internal data model stored on the end user's device.
   models/          # Data structures used by multiple components
   pages/           # Different routes in the application are stored here
   utils/           # Utility functions and hooks
     data/          # Utility functions related to data
     hooks/         # Useful React Hooks
test/               # Integration or Scalability Tests. 
utils/              # Scripts used to administer the project as a whole
worker/             # Cloud Services implemented using Cloudflare Workers
   sync/            # Referee FYI Sync Service
      src/       
         objects/   # Durable Objects
         routers/   # Subrouters to handle endpoints
         utils/     # Service-specific utility functions
```


## Initial Setup

Ensure you have the following software installed on your machine:
- [**Node.js**](https://nodejs.org) LTS.

After you checkout, run `npm i` to install all dependencies, including build
tooling.

```
cd referee.fyi
npm i
```

### `.env` Setup

Additionally, you'll want to create a `.env.local` file to populate environment
variables into Vite when running the development server locally. Each
environment variable is explained below.

```
VITE_REFEREE_FYI_SHARE_SERVER=https://staging.share.referee.fyi
```

Specifies the share server URL to use when connecting. For most development that
does not touch the sharing server, you should use the staging server (listed
above).


```
VITE_REFEREE_FYI_BUILD_MODE=STANDARD
```

The build mode is used to enable some features for the worlds build, changing
how the sharing mechanism works, displaying additional information, and
disabling some features. For most cases, you should keep it `STANDARD`

```
VITE_REFEREE_FYI_ENABLE_SENTRY=false
```

Enable [Sentry](https://sentry.io) reporting in this environment. You should set
this to no.

```
VITE_ROBOTEVENTS_TOKEN=<TOKEN>
```

The bearer token used to authenticate with the RobotEvents API to fetch data.
You should request a token from [here](https://robotevents.com/api/v2) and
supply it here.

```
VITE_LOGSERVER_TOKEN=<TOKEN>
```

The token to use when submitting dumps to the LogServer (Brendan's
project-agnostic system dump service). Contact Brendan to get a token.

```
SENTRY_AUTH_TOKEN=<TOKEN>
```

Token to use when submitting issues to Sentry's error reporting system.

> **Why do we have both Sentry and LogServer?** Partially historical, partial
> practical. The logserver is used to submit dumps of the current state of the
> application, including all locally stored. This is done intentionally by the
> end user (via the submit feedback form) and includes a ton more data about the
> user's session, including the contents of all locally stored data. Sentry is
> for automatic reporting of issues without user intervention.

## Application Development

Once you have dependencies installed, run a local instance of Referee FYI in
development mode. This should prompt you to visit `http://localhost:3000` (or
another URL), and includes watch mode for both `src` (application content) and
`lib` (shared libraries between server and client).

```
npm run dev
```


## Share Server Development
For most development, you should probably use the staging sync server at
`https://staging.share.referee.fyi`, but if you 


### [Optional] Secure Share Server Development Locally
If you wish to develop for the sync service locally, and have a mechanism
allowing you to use HTTPS on your local network (this can be useful when testing
multi-device setup), you can instruct Wrangler to use particular HTTPS
certificates for the Sync Service by running `npm run `

## Code of Conduct
As contributors and maintainers of this project, and in the interest of
fostering an open and welcoming community, we pledge to respect all people who
contribute through reporting issues, posting feature requests, updating
documentation, submitting pull requests or patches, and other activities. We are
committed to making participation in this project a harassment-free experience
for everyone, regardless of level of experience, gender, gender identity and
expression, sexual orientation, disability, personal appearance, body size,
race, ethnicity, age, religion, or nationality.

Examples of unacceptable behavior by participants include:

- The use of sexualized language or imagery
- Personal attacks
- Trolling or insulting/derogatory comments
- Public or private harassment
- Publishing other’s private information, such as physical or electronic
  addresses, without explicit permission
- Other unethical or unprofessional conduct
- Project maintainers have the right and responsibility to remove, edit, or
  reject comments, commits, code, wiki edits, issues, and other contributions
  that are not aligned to this Code of Conduct. By adopting this Code of
  Conduct, project maintainers commit themselves to fairly and consistently
  applying these principles to every aspect of managing this project. Project
  maintainers who do not follow or enforce the Code of Conduct may be
  permanently removed from the project team.

This code of conduct applies both within project spaces and in public spaces
when an individual is representing the project or its community. Instances of
abusive, harassing, or otherwise unacceptable behavior may be reported by
opening an issue or contacting one or more of the project maintainers.

This Code of Conduct is adapted from the Contributor Covenant, version 1.2.0,
available at
https://www.contributor-covenant.org/version/1/2/0/code-of-conduct.html

## Contributor License Agreement

In order to contribute to this project, you must agree to this contributor
license agreement.

1. Definitions. "You" (or "Your") shall mean the copyright owner or legal entity
 authorized by the copyright owner that is making this Agreement with the
 Project. For legal entities, the entity making a Contribution and all other
 entities that control, are controlled by, or are under common control with that
 entity are considered to be a single Contributor. For the purposes of this
 definition, "control" means (i) the power, direct or indirect, to cause the
 direction or management of such entity, whether by contract or otherwise, or
 (ii) ownership of fifty percent (50%) or more of the outstanding shares, or
 (iii) beneficial ownership of such entity. "Contribution" shall mean any
 original work of authorship, including any modifications or additions to an
 existing work, that is intentionally submitted by You to the Project for
 inclusion in, or documentation of, any of the products owned or managed by the
 Project (the "Work"). For the purposes of this definition, "submitted" means
 any form of electronic, verbal, or written communication sent to the Project or
 its representatives, including but not limited to communication on electronic
 mailing lists, source code control systems, and issue tracking systems that are
 managed by, or on behalf of, the Project for the purpose of discussing and
 improving the Work, but excluding communication that is conspicuously marked or
 otherwise designated in writing by You as "Not a Contribution."

2. Grant of Copyright License. Subject to the terms and conditions of this
 Agreement, You hereby grant to the Project and to recipients of software
 distributed by the Project a perpetual, worldwide, non-exclusive, no-charge,
 royalty-free, irrevocable copyright license to reproduce, prepare derivative
 works of, publicly display, publicly perform, sublicense, and distribute Your
 Contributions and such derivative works.

3. Grant of Patent License. Subject to the terms and conditions of this
 Agreement, You hereby grant to the Project and to recipients of software
 distributed by the Project a perpetual, worldwide, non-exclusive, no-charge,
 royalty-free, irrevocable (except as stated in this section) patent license to
 make, have made, use, offer to sell, sell, import, and otherwise transfer the
 Work, where such license applies only to those patent claims licensable by You
 that are necessarily infringed by Your Contribution(s) alone or by combination
 of Your Contribution(s) with the Work to which such Contribution(s) was
 submitted. If any entity institutes patent litigation against You or any other
 entity (including a cross-claim or counterclaim in a lawsuit) alleging that
 your Contribution, or the Work to which you have contributed, constitutes
 direct or contributory patent infringement, then any patent licenses granted to
 that entity under this Agreement for that Contribution or Work shall terminate
 as of the date such litigation is filed.

4. You represent that you are legally entitled to grant the above license. If
 your employer(s) has rights to intellectual property that you create that
 includes your Contributions, you represent that you have received permission to
 make Contributions on behalf of that employer, that your employer has waived
 such rights for your Contributions to the Project, or that your employer has
 executed a separate Corporate CLA with the Project.

5. You represent that each of Your Contributions is Your original creation (see
 section 7 for submissions on behalf of others). You represent that Your
 Contribution submissions include complete details of any third-party license or
 other restriction (including, but not limited to, related patents and
 trademarks) of which you are personally aware and which are associated with any
 part of Your Contributions.

6. You are not expected to provide support for Your Contributions, except to the
 extent You desire to provide support. You may provide support for free, for a
 fee, or not at all. Unless required by applicable law or agreed to in writing,
 You provide Your Contributions on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 CONDITIONS OF ANY KIND, either express or implied, including, without
 limitation, any warranties or conditions of TITLE, NON- INFRINGEMENT,
 MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE.

7. Should You wish to submit work that is not Your original creation, You may
 submit it to the Project separately from any Contribution, identifying the
 complete details of its source and of any license or other restriction
 (including, but not limited to, related patents, trademarks, and license
 agreements) of which you are personally aware, and conspicuously marking the
 work as "Submitted on behalf of a third-party: [named here]".

8. You agree to notify the Project of any facts or circumstances of which you
 become aware that would make these representations inaccurate in any respect.