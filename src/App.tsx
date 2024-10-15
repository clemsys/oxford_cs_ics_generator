import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import {
  Button,
  Container,
  Group,
  MantineProvider,
  MultiSelect,
  Select,
  Stack,
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
} from "./generate_ics";

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
    for (const [type, groups] of Object.entries(typeGroups)) {
      if (
        course in sessionsGroups &&
        sessionsGroups[course][type as keyof typeof SessionType].length > 0
      ) {
        selects.push(
          <Select
            key={`${course}-${type}`}
            label={`${course} ${type} group `}
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

const terms = ["MT2024", "HT2024", "TT2024"];

export default function App() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [date, setDate] = useState<Date | null>(new Date(2024, 9, 14));
  const [selectedTerm, setSelectedTerm] = useState<string | null>(terms[0]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsGroups, setSessionsGroups] = useState<SessionsGroups>({});
  const [selectedGroups, setSelectedGroups] = useState<SessionsGroup>({});

  useEffect(() => {
    fetch(`/teaching/timetables/timetable-${selectedTerm}.html`, {
      method: "GET",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }).then((response) => response.text().then((text) => setHtmlContent(text)));
  }, [selectedTerm]);
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
              data={terms}
            />
            <DateInput
              value={date}
              onChange={(d) => {
                if (d.getDay() == 1) {
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
          <Button
            onClick={() => {
              if (
                sessions.length > 0 &&
                validSelectedGroups(sessionsGroups, selectedGroups)
              ) {
                download(
                  "Oxford_CS.ics",
                  generateICS(sessions, selectedGroups),
                );
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
