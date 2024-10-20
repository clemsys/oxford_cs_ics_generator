import { useEffect, useState } from "react";
import { computeOverlap, Session } from "./generate_ics";
import { useDisclosure } from "@mantine/hooks";
import { Collapse, Group, List, Text, UnstyledButton } from "@mantine/core";

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
