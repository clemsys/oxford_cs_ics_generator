import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { Button, Container, MantineProvider, Stack } from "@mantine/core";
import {
  generateICS,
  download,
  SessionsGroups,
  SessionsGroup,
  Session,
  getSelectedSessions,
  completeSessionsGroup,
  getSessionsGroups,
  SessionType,
} from "./generate_ics";
import { Overlaps } from "./Overlaps";
import { CoursesSelection } from "./CoursesSelection";
import { useEffect, useState } from "react";
import { GroupsSelection } from "./GroupsSelection";

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

export const App = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsGroups, setSessionsGroups] = useState<SessionsGroups>({});
  const [selectedGroups, setSelectedGroups] = useState<SessionsGroup>({});
  const [selectedSessions, setSelectedSessions] = useState<Session[]>([]);

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
          <CoursesSelection setSessions={setSessions} />
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
