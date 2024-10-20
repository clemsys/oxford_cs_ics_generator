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
  getSelectedSessions,
} from "./generate_ics";
import { Overlaps } from "./Overlaps";
import { GroupsSelection } from "./GroupsSelection";

const getCourses = (html: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const courseDivs = doc.querySelectorAll("div.eventCourse");
  const courses = Array.from(courseDivs).map(
    (div) => div.children[0].innerHTML,
  );
  return courses
    .filter((course, index) => courses.indexOf(course) === index)
    .sort();
};

const CoursesChipGroup = ({
  courses,
  selectedCourses,
  setSelectedCourses,
}: {
  courses: string[];
  selectedCourses: string[];
  setSelectedCourses: (courses: string[]) => void;
}) => {
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
};

const validSelectedGroups = (
  sessionsGroups: SessionsGroups,
  selectedGroups: SessionsGroup,
): boolean => {
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
};

const terms: { [key: string]: string } = {
  Michaelmas: "MT",
  Hilary: "HT",
  Trinity: "TT",
};

export const App = () => {
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
          <Overlaps selectedSessions={selectedSessions} />
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
};
