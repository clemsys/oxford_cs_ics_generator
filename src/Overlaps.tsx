import { useEffect, useState } from "react";
import { Session } from "./generate_ics";
import { useDisclosure } from "@mantine/hooks";
import { Collapse, Group, List, Text, UnstyledButton } from "@mantine/core";
import dayjs from "dayjs";

/**
 * Convenience type for specifying which two sessions are involved in one overlap.
 */
type Overlap = [Session, Session];

// overlap in number of hours
const computeOverlap = (
  sessions: Session[],
): [Overlap[], number] => {
  const sortedSessions = sessions.sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  const overlaps: Overlap[] = [];
  let totalOverlapHours = 0;

  for (let i = 0; i < sortedSessions.length - 1; i++) {
    const session = sortedSessions[i];
    let j = i + 1;
    while (
      j < sortedSessions.length &&
      session.endDate > sortedSessions[j].startDate
    ) {
      const overlap: Overlap = [session, sortedSessions[j]];
      overlaps.push(overlap);
      totalOverlapHours += getOverlapDuration(overlap);
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
              const startDate = getOverlapStart(s);
              const endDate = getOverlapEnd(s);

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

/**
 * Returns the start datetime of a given overlap.
 */
function getOverlapStart(overlap: Overlap): Date {
  return new Date(
    Math.max(overlap[0].startDate.getTime(), overlap[1].startDate.getTime()),
  );
}

/**
 * Returns the end datetime of a given overlap.
 */
function getOverlapEnd(overlap: Overlap): Date {
  return new Date(
    Math.min(overlap[0].endDate.getTime(), overlap[1].endDate.getTime()),
  );
}

/**
 * Returns the length of the given overlap in hours.
 */
function getOverlapDuration(overlap: Overlap): number {
  const start = getOverlapStart(overlap);
  const end = getOverlapEnd(overlap);

  return dayjs(end).diff(start, "hours");
}
