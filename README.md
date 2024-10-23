# Oxford CS .ics generator

Author: [Clément Chapot](mailto:contact+dev@clementchapot.com) <br/>
License: MIT <br/>
Main instance: [https://oxford_cs_ics.chapot.ovh/](https://oxford_cs_ics.chapot.ovh/)

## Purpose

This website is meant to generate `.ics` iCal files from the `.html` timetables of [Oxford University's CS department website](https://www.cs.ox.ac.uk/teaching/timetables). These files can then be imported in Apple/Google calendar and others.

## Features

- Works for all terms, the user has to provide the date on which the term starts
- Select courses and groups for the practicals and classes of these courses
- Always uses the last timetables available from the CS department (no cache)
- Parses all the data available from the `.html` timetables of the CS department: weeks, days, hours, session type, location and group when relevant
- Tells the user when sessions overlap

## Future work

- Assign groups automatically to minimize overlaps between sessions, while prioritizing the classes and practicals for which attendance is mandatory. Other secondary criteria could be applied such as having at least one hour for lunch or avoiding early/late sessions
- Give more flexibility regarding the generation of the `.ics`. For instance, generate separate files for lectures/classes/practicals
- Provide a visualisation of the calendar in the browser before exporting it

## Tech stack

This website is just a frontend (no backend). It is written in typescript using [React](https://react.dev/), [Vite](https://vite.dev/) and [Mantine](https://mantine.dev/). It is deployed in a Caddy container which acts as both a webserver for the website and a reverse-proxy for the [html timetable pages of the CS department](https://www.cs.ox.ac.uk/teaching/timetables)

## Running for local development

```bash
$ npm install
$ npm run dev
```

The app root is at `src/App.tsx`

## Running the container

```bash
$ podman build . -t oxford-cs-ics-generator
$ podman run -p 8080:8080 -d oxford-cs-ics-generator
```
