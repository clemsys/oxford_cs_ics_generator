# Oxford CS .ics generator

Author: [Clément Chapot](mailto:contact+dev@clementchapot.com)

## Running for local development

```bash
npm install
npm run dev
```

## Running the container

```bash
podman build . -t oxford-cs-ics-generator
podman run -p 8080:8080 -d oxford-cs-ics-generator
```
