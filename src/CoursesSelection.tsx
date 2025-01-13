import { Group, MultiSelect, Select } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useEffect, useState } from "react";
import { Session } from "./generate_ics";
import { getSessions } from "./get_sessions.ts";

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

const terms: { [key: string]: string } = {
  Michaelmas: "MT",
  Hilary: "HT",
  Trinity: "TT",
};

export const CoursesSelection = ({
  setSessions,
}: {
  setSessions: (sessions: Session[]) => void;
}) => {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [date, setDate] = useState<Date | null>(new Date(2025, 0, 20));
  const [selectedTerm, setSelectedTerm] = useState<string | null>(
    Object.keys(terms)[1],
  );
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

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
    } else {
      setHtmlContent("");
    }
  }, [selectedTerm, date]);
  useEffect(() => {
    if (date) {
      setSessions(getSessions(htmlContent, date, selectedCourses));
    }
  }, [date, htmlContent, selectedCourses, setSessions]);
  useEffect(() => {
    setSelectedCourses([]);
  }, [selectedTerm]);
  useEffect(() => {
    setCourses(getCourses(htmlContent));
  }, [htmlContent]);
  useEffect(() => {
    if (date) {
      setSessions(getSessions(htmlContent, date, selectedCourses));
    }
  }, [date, htmlContent, selectedCourses, setSessions]);

  return (
    <>
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
    </>
  );
};
