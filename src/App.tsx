import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import {
  Button,
  Collapse,
  Container,
  Group,
  List,
  MantineProvider,
  MultiSelect,
  Select,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useEffect, useState } from "react";
import {
  generateICS,
  download,
  getSessions,
  getSessionsGroups,
  SessionsGroups,
  Session,
  SessionsGroup,
  SessionType,
  completeSessionsGroup,
  computeOverlap,
  getSelectedSessions,
} from "./generate_ics";
import { useDisclosure } from "@mantine/hooks";

function getCourses(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const courseDivs = doc.querySelectorAll("div.eventCourse");
  const courses = Array.from(courseDivs).map(
    (div) => div.children[0].innerHTML,
  );
  return courses
    .filter((course, index) => courses.indexOf(course) === index)
    .sort();
}

function CoursesChipGroup({
  courses,
  selectedCourses,
  setSelectedCourses,
}: {
  courses: string[];
  selectedCourses: string[];
  setSelectedCourses: (courses: string[]) => void;
}) {
  return (
    <MultiSelect
      label="Courses"
      placeholder={selectedCourses.length == 0 ? "Select courses" : ""}
      data={courses}
      value={selectedCourses}
      onChange={setSelectedCourses}
      maxDropdownHeight={400}
    />
  );
}

function lowerCaseExceptFirst(s: string): string {
  return s[0] + s.substring(1).toLowerCase();
}

function GroupsSelection({
  sessionsGroups,
  selectedGroups,
  setSelectedGroups,
}: {
  sessionsGroups: SessionsGroups;
  selectedGroups: SessionsGroup;
  setSelectedGroups: (selectedGroups: SessionsGroup) => void;
}) {
  const selects = [];
  for (const [course, typeGroups] of Object.entries(sessionsGroups)) {
    const courseSelects = [];
    for (const [type, groups] of Object.entries(typeGroups)) {
      if (
        course in sessionsGroups &&
        sessionsGroups[course][type as keyof typeof SessionType].length > 0
      ) {
        courseSelects.push(
          <Select
            key={`${course}-${type}`}
            label={`${lowerCaseExceptFirst(course)} ${type.toLowerCase()}`}
            placeholder="Select group"
            data={groups.map((group) => group.toString())}
            value={
              course in selectedGroups &&
              selectedGroups[course][type as keyof typeof SessionType] != null
                ? selectedGroups[course][
                    type as keyof typeof SessionType
                  ]!.toString()
                : null
            }
            onChange={(value) =>
              setSelectedGroups({
                ...selectedGroups,
                [course]: {
                  ...selectedGroups[course],
                  [type as keyof typeof SessionType]: value
                    ? parseInt(value)
                    : null,
                },
              })
            }
          />,
        );
      }
    }
    selects.push(
      <Group grow key={course} align="end">
        {...courseSelects}
      </Group>,
    );
  }
  return (
    <Stack justify="flex-start" align="stretch">
      {selects}
    </Stack>
  );
}

function validSelectedGroups(
  sessionsGroups: SessionsGroups,
  selectedGroups: SessionsGroup,
): boolean {
  for (const [course, typeGroups] of Object.entries(selectedGroups)) {
    for (const [type, group] of Object.entries(typeGroups)) {
      if (
        group == null &&
        sessionsGroups[course][type as keyof typeof SessionType].length > 0
      ) {
        return false;
      }
    }
  }
  return true;
}

function OverlappingHours({
  selectedSessions,
}: {
  selectedSessions: Session[];
}) {
  const [overlappingHours, setOverlappingHours] = useState<number>(0);
  const [overlaps, setOverlaps] = useState<[Session, Session][]>([]);
  const [opened, { toggle }] = useDisclosure(false);

  useEffect(() => {
    const [sessionsOverlaps, totalOverlappingHours] =
      computeOverlap(selectedSessions);
    setOverlappingHours(totalOverlappingHours);
    setOverlaps(sessionsOverlaps);
  }, [selectedSessions]);

  if (overlappingHours == 0) {
    return <div></div>;
  } else {
    return (
      <div>
        <Group justify="space-between">
          <Text c="red" flex-grow>
            Total overlapping hours over term: {overlappingHours}
          </Text>
          <UnstyledButton onClick={toggle}>
            {opened ? "▴ " : "▾ "} details
          </UnstyledButton>
        </Group>
        <Collapse in={opened}>
          <List>
            {overlaps.map((s) => {
              const startDate = new Date(
                Math.max(s[0].startDate.getTime(), s[1].startDate.getTime()),
              );
              const endDate = new Date(
                Math.min(s[0].endDate.getTime(), s[1].endDate.getTime()),
              );
              const dateString =
                startDate.toLocaleDateString("en-GB", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }) +
                " from " +
                startDate.toLocaleTimeString("en-GB", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: false,
                }) +
                " to " +
                endDate.toLocaleTimeString("en-GB", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: false,
                });
              return (
                <List.Item
                  key={
                    s[0].startDate.getTime().toString() +
                    s[1].startDate.getTime().toString() +
                    s[0].endDate.getTime().toString() +
                    s[1].endDate.getTime().toString() +
                    s[0].course +
                    s[1].course
                  }
                >
                  <div>{dateString}</div>
                  <div>
                    {lowerCaseExceptFirst(s[0].course + " " + s[0].type)}{" "}
                  </div>
                  <div>
                    {lowerCaseExceptFirst(s[1].course + " " + s[1].type)}
                  </div>
                </List.Item>
              );
            })}
          </List>
        </Collapse>
      </div>
    );
  }
}

const terms: { [key: string]: string } = {
  Michaelmas: "MT",
  Hilary: "HT",
  Trinity: "TT",
};

export default function App() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [date, setDate] = useState<Date | null>(new Date(2024, 9, 14));
  const [selectedTerm, setSelectedTerm] = useState<string | null>(
    Object.keys(terms)[0],
  );
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsGroups, setSessionsGroups] = useState<SessionsGroups>({});
  const [selectedGroups, setSelectedGroups] = useState<SessionsGroup>({});
  const [selectedSessions, setSelectedSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (selectedTerm && date) {
      fetch(
        `/teaching/timetables/timetable-${terms[selectedTerm]}${date.getFullYear()}.html`,
        {
          method: "GET",
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ).then((response) =>
        response.text().then((text) => setHtmlContent(text)),
      );
    }
  }, [selectedTerm, date]);
  useEffect(() => {
    if (date) {
      setSessions(getSessions(htmlContent, date, selectedCourses));
    }
  }, [date, htmlContent, selectedCourses]);
  useEffect(() => {
    setSelectedCourses([]);
  }, [selectedTerm]);
  useEffect(() => {
    setCourses(getCourses(htmlContent));
  }, [htmlContent]);
  useEffect(() => {
    setSessionsGroups(getSessionsGroups(sessions));
  }, [sessions]);
  useEffect(() => {
    setSelectedGroups((s) => completeSessionsGroup(s, sessionsGroups));
  }, [sessionsGroups]);
  useEffect(() => {
    setSelectedSessions(getSelectedSessions(sessions, selectedGroups));
  }, [selectedGroups, sessions]);

  return (
    <MantineProvider defaultColorScheme="auto">
      <Container size="sm">
        <Stack mb="md" mt="md" justify="flex-start" align="stretch">
          <Group grow>
            <Select
              label="Term"
              placeholder="Select term"
              value={selectedTerm}
              onChange={setSelectedTerm}
              data={Object.keys(terms)}
            />
            <DateInput
              value={date}
              onChange={(d) => {
                if (d && d.getDay() == 1) {
                  setDate(d);
                }
              }}
              label="Monday of week 1"
              placeholder="Select Monday of week 1"
              excludeDate={(date) => date.getDay() !== 1}
            />
          </Group>
          <CoursesChipGroup
            courses={courses}
            selectedCourses={selectedCourses}
            setSelectedCourses={setSelectedCourses}
          />
          <GroupsSelection
            sessionsGroups={sessionsGroups}
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
          />
          <OverlappingHours selectedSessions={selectedSessions} />
          <Button
            onClick={() => {
              if (
                sessions.length > 0 &&
                validSelectedGroups(sessionsGroups, selectedGroups)
              ) {
                download("Oxford_CS.ics", generateICS(selectedSessions));
              }
            }}
          >
            Generate .ics
          </Button>
        </Stack>
      </Container>
    </MantineProvider>
  );
}
