function getWeeks(dirtyString: string): number[] {
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
}

// Monday is 1, Friday is 5
function getWeekDay(tdElement: HTMLElement): number {
  return Array.from(tdElement.parentNode!.children).indexOf(tdElement);
}

function getGroup(s: string): number | null {
  if (s.includes("Group")) {
    return Number(s.replace(/[^0-9]/g, ""));
  }
  return null;
}

// zero pad two digits number function for hours, minutes, days, months
function zeroPad(x: number): string {
  return x.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
}

function generateRandomHex(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomValue = Math.floor(Math.random() * 16);
    result += randomValue.toString(16);
  }
  return result;
}

declare global {
  interface Date {
    addDays(days: number): Date;
    addTime(t: string): Date;
    iCalFormat(): string;
  }
}

Date.prototype.addDays = function (days: number): Date {
  const date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

// add "hours:minutes"
Date.prototype.addTime = function (t: string): Date {
  const [h, m] = t.split(":").map((x) => Number(x));
  this.setTime(this.getTime() + (h * 60 + m) * 60 * 1000);
  return this;
};

Date.prototype.iCalFormat = function (): string {
  return `${this.getFullYear()}${zeroPad(this.getMonth() + 1)}${zeroPad(this.getDate())}T${zeroPad(this.getHours())}${zeroPad(this.getMinutes())}00`;
};

export enum SessionType {
  Lecture = "Lecture",
  Class = "Class",
  Practical = "Practical",
}

function getSessionType(element: HTMLElement): SessionType {
  return SessionType[
    element.className
      .split(" ")
      .filter((className: string) =>
        Object.keys(SessionType).includes(className),
      )[0] as keyof typeof SessionType
  ];
}

export interface RecurringSession {
  course: string;
  startDate: Date;
  endDate: Date;
  loc: string;
  type: SessionType;
  weeks: number[];
  weekDay: number;
  group: number | null;
}

export interface Session {
  course: string;
  startDate: Date;
  endDate: Date;
  loc: string;
  type: SessionType;
  group: number | null;
}

export type SessionsGroups = {
  [course: string]: { [sessionType in SessionType]: number[] };
};

export type SessionsGroup = {
  [course: string]: { [sessionType in SessionType]: number | null };
};

export function completeSessionsGroup(
  selectedGroups: SessionsGroup,
  sessionsGroups: SessionsGroups,
) {
  const sessionsGroup: SessionsGroup = {};
  for (const course in sessionsGroups) {
    sessionsGroup[course] =
      course in selectedGroups
        ? selectedGroups[course]
        : {
            Lecture: null,
            Class: null,
            Practical: null,
          };
  }
  return sessionsGroup;
}

export function getSessions(
  htmlContent: string,
  mondayWeekOne: Date,
  selectedCoursesNames: string[],
): Session[] {
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
}

export function getSessionsGroups(sessions: Session[]): SessionsGroups {
  const sessionsGroups: SessionsGroups = {};
  for (const session of sessions) {
    if (session.group) {
      if (!(session.course in sessionsGroups)) {
        sessionsGroups[session.course] = {
          Lecture: [],
          Class: [],
          Practical: [],
        };
      }
      if (
        !sessionsGroups[session.course][session.type].includes(session.group)
      ) {
        sessionsGroups[session.course][session.type].push(session.group);
        sessionsGroups[session.course][session.type].sort();
      }
    }
  }
  return sessionsGroups;
}

export function getSelectedSessions(
  sessions: Session[],
  selectedGroups: SessionsGroup,
) {
  return sessions.filter((session) => {
    const group =
      session.course in selectedGroups
        ? selectedGroups[session.course][session.type]
        : null;
    return session.group == group;
  });
}

// overlap in number of hours
export function computeOverlap(sessions: Session[]): number {
  const sortedSessions = sessions.sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  let totalOverlapHours = 0;

  for (let i = 0; i < sortedSessions.length - 1; i++) {
    const session = sortedSessions[i];
    let j = i + 1;
    while (
      j < sortedSessions.length &&
      session.endDate > sortedSessions[j].startDate
    ) {
      totalOverlapHours +=
        (session.endDate.getTime() - sortedSessions[j].startDate.getTime()) /
        3600000;
      j++;
    }
  }

  return totalOverlapHours;
}

export function generateICS(sessions: Session[]): string {
  const icsSessions = [];

  for (const session of sessions) {
    const groupString = session.group ? `[Gr ${session.group}]` : "";
    const typeString =
      session.type == SessionType.Lecture
        ? ""
        : `[${SessionType[session.type]}]`;

    icsSessions.push(`
BEGIN:VEVENT
UID:${generateRandomHex(8)}-${generateRandomHex(4)}-${generateRandomHex(4)}-${generateRandomHex(4)}-${generateRandomHex(12)}
DTSTAMP:${new Date(Date.now()).iCalFormat()}Z
DTSTART;TZID=Europe/London:${session.startDate.iCalFormat()}
DTEND;TZID=Europe/London:${session.endDate.iCalFormat()}
LOCATION:${session.loc}
SUMMARY:${typeString} ${groupString} ${session.course}
END:VEVENT`);
  }

  const iCalHeader = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN
BEGIN:VTIMEZONE
TZID:Europe/London
BEGIN:STANDARD
TZNAME:GMT
TZOFFSETFROM:+0100
TZOFFSETTO:+0000
DTSTART:19961027T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
BEGIN:DAYLIGHT
TZNAME:BST
TZOFFSETFROM:+0000
TZOFFSETTO:+0100
DTSTART:19810329T010000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
END:VTIMEZONE`;

  const iCalFooter = `
END:VCALENDAR`;

  const iCalContent = iCalHeader
    .concat(icsSessions.join(""))
    .concat(iCalFooter);

  return iCalContent;
}

export function download(filename: string, text: string) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text),
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
