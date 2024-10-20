import { Session, SessionType } from "./generate_ics";

const getWeeks = (dirtyString: string): number[] => {
  const cleanString = dirtyString.replace(/[^0-9,-]/g, "");
  if (cleanString.includes("-")) {
    const [firstWeek, lastWeek] = cleanString.split("-").map((x) => Number(x));
    return Array.from(
      { length: lastWeek - firstWeek + 1 },
      (_, i) => i + firstWeek,
    );
  } else {
    return cleanString.split(",").map((x) => Number(x));
  }
};

// Monday is 1, Friday is 5
const getWeekDay = (tdElement: HTMLElement): number => {
  return Array.from(tdElement.parentNode!.children).indexOf(tdElement);
};

const getGroup = (s: string): number | null => {
  if (s.includes("Group")) {
    return Number(s.replace(/[^0-9]/g, ""));
  }
  return null;
};

const getSessionType = (element: HTMLElement): SessionType => {
  return SessionType[
    element.className
      .split(" ")
      .filter((className: string) =>
        Object.keys(SessionType).includes(className),
      )[0] as keyof typeof SessionType
  ];
};

export const getSessions = (
  htmlContent: string,
  mondayWeekOne: Date,
  selectedCoursesNames: string[],
): Session[] => {
  const html = new DOMParser().parseFromString(htmlContent, "text/html");
  const allSessions = html.querySelectorAll("div.eventCourse");
  const sessions: Session[] = [];

  for (const session of allSessions) {
    const sessionName = session.children[0].textContent || "";
    if (selectedCoursesNames.includes(sessionName)) {
      const parentNode = session.parentNode! as HTMLElement;
      const [sessionStartTime, sessionEndTime] = parentNode
        .querySelector("div.eventTime")!
        .textContent!.split(" - ");
      const sessionLocation =
        parentNode.querySelector("div.eventLocation")!.textContent || "";
      const sessionType = getSessionType(parentNode);
      const sessionWeeks = getWeeks(
        parentNode.querySelector("div.eventWeeks")!.textContent!,
      );
      const sessionWeekDay = getWeekDay(session.parentNode as HTMLElement);

      const sessionDescription = parentNode.querySelector(
        "div.eventDescription",
      );
      const sessionGroup = sessionDescription
        ? getGroup(sessionDescription.textContent!)
        : null;

      for (const week of sessionWeeks) {
        const sessionDay = new Date(mondayWeekOne).addDays(
          (week - 1) * 7 + sessionWeekDay - 1,
        );
        const startDate = new Date(sessionDay).addTime(sessionStartTime);
        const endDate = new Date(sessionDay).addTime(sessionEndTime);

        sessions.push({
          course: sessionName,
          startDate: startDate,
          endDate: endDate,
          loc: sessionLocation,
          type: sessionType,
          group: sessionGroup,
        });
      }
    }
  }
  return sessions;
};
