import { Group, Select, Stack } from "@mantine/core";
import { SessionsGroup, SessionsGroups, SessionType } from "./generate_ics";

const lowerCaseExceptFirst = (s: string): string => {
  return s[0] + s.substring(1).toLowerCase();
};

export const GroupsSelection = ({
  sessionsGroups,
  selectedGroups,
  setSelectedGroups,
}: {
  sessionsGroups: SessionsGroups;
  selectedGroups: SessionsGroup;
  setSelectedGroups: (selectedGroups: SessionsGroup) => void;
}) => {
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
};
