import { useEffect, useState } from "react";
import { Session } from "./generate_ics";
import { useDisclosure } from "@mantine/hooks";
import { Collapse, Group, List, Text, UnstyledButton } from "@mantine/core";

// overlap in number of hours
const computeOverlap = (
  sessions: Session[],
): [[Session, Session][], number] => {
  const sortedSessions = sessions.sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  const overlaps: [Session, Session][] = [];
  let totalOverlapHours = 0;

  for (let i = 0; i < sortedSessions.length - 1; i++) {
    const session = sortedSessions[i];
    let j = i + 1;
    while (
      j < sortedSessions.length &&
      session.endDate > sortedSessions[j].startDate
    ) {
      overlaps.push([session, sortedSessions[j]]);
      totalOverlapHours +=
        (session.endDate.getTime() - sortedSessions[j].startDate.getTime()) /
        3600000;
      j++;
    }
  }

  return [overlaps, totalOverlapHours];
};

const lowerCaseExceptFirst = (s: string): string => {
  return s[0] + s.substring(1).toLowerCase();
};

export const Overlaps = ({
  selectedSessions,
}: {
  selectedSessions: Session[];
}) => {
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
};
