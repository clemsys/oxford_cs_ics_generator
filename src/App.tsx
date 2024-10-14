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
  SessionGroups,
  Session,
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
  sessionsGroups: SessionGroups[];
  selectedGroups: (string | null)[];
  setSelectedGroups: (groups: (string | null)[]) => void;
}) {
  return (
    <Stack justify="flex-start" align="stretch">
      {sessionsGroups.map((sessionGroups, index) => (
        <Select
          key={index}
          label={`${sessionGroups.name} ${sessionGroups.type.toLowerCase()} group `}
          placeholder="Select group"
          data={sessionGroups.groups.map((group) => group.toString())}
          value={selectedGroups[index]}
          onChange={(value) =>
            setSelectedGroups(
              selectedGroups.map((v, i) => (i === index ? value : v)),
            )
          }
        />
      ))}
    </Stack>
  );
}

const terms = ["MT2024"];

export default function App() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [date, setDate] = useState<Date | null>(new Date(2024, 9, 14));
  const [selectedTerm, setSelectedTerm] = useState<string | null>(terms[0]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsGroups, setSessionsGroups] = useState<SessionGroups[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<(string | null)[]>([]);

  useEffect(() => {
    fetch(`/timetable-${selectedTerm}.html`, {
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
    console.log("fetching courses");
    setCourses(getCourses(htmlContent));
  }, [htmlContent]);
  useEffect(() => {
    setSessionsGroups(getSessionsGroups(sessions));
  }, [sessions]);
  useEffect(() => {
    setSelectedGroups(sessionsGroups.map(() => null));
  }, [sessionsGroups]);

  return (
    <MantineProvider defaultColorScheme="auto">
      <Container size="sm">
        <Stack mt="md" justify="flex-start" align="stretch">
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
              onChange={setDate}
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
              if (sessions.length > 0) {
                download(
                  "Oxford_CS.ics",
                  generateICS(sessions, sessionsGroups, selectedGroups),
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
