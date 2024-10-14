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
function getWeekDay(tdElement: HTMLElement) {
  return Array.from(tdElement.parentNode!.children).indexOf(tdElement);
}

function getGroup(s: string): number | null {
  if (s.includes("Group")) {
    return Number(s.replace(/[^0-9]/g, ""));
  }
  return null;
}

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

enum SessionType {
  Lecture = "Lecture",
  Practical = "Practical",
  Class = "Class",
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

export interface Session {
  name: string;
  startDate: Date;
  endDate: Date;
  loc: string;
  type: SessionType;
  weeks: number[];
  weekDay: number;
  group: number | null;
}

export interface SessionGroups {
  name: string;
  type: SessionType;
  groups: number[];
}

function compareSessionGroups(a: SessionGroups, b: SessionGroups): number {
  if (a.name < b.name) {
    return -1;
  } else if (a.name > b.name) {
    return 1;
  } else {
    return a.type.localeCompare(b.type);
  }
}

export function getSessions(
  htmlContent: string,
  mondayWeekOne: Date,
  selectedCoursesNames: string[],
) {
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
          name: sessionName,
          startDate: startDate,
          endDate: endDate,
          loc: sessionLocation,
          type: sessionType,
          weeks: sessionWeeks,
          weekDay: sessionWeekDay,
          group: sessionGroup,
        });
      }
    }
  }
  return sessions;
}

export function getSessionsGroups(sessions: Session[]): SessionGroups[] {
  const sessionsGroups: SessionGroups[] = [];
  for (const session of sessions) {
    if (session.group) {
      const sessionIndex = sessionsGroups.findIndex(
        (x) => x.name === session.name && x.type === session.type,
      );
      if (sessionIndex === -1) {
        sessionsGroups.push({
          name: session.name,
          type: session.type,
          groups: [session.group],
        });
      } else if (!sessionsGroups[sessionIndex].groups.includes(session.group)) {
        sessionsGroups[sessionIndex].groups.push(session.group);
      }
    }
  }
  for (const sessionGroup of sessionsGroups) {
    sessionGroup.groups.sort();
  }
  sessionsGroups.sort((a, b) => compareSessionGroups(a, b));
  return sessionsGroups;
}

function getGroupFromSessions(
  sessionName: string,
  sessionType: SessionType,
  sessionsGroups: SessionGroups[],
  selectedGroups: (string | null)[],
) {
  const i = sessionsGroups.findIndex(
    (x) => x.name === sessionName && x.type === sessionType,
  );
  if (i >= 0) {
    return selectedGroups[i];
  }
  return null;
}

export function generateICS(
  sessions: Session[],
  sessionsGroups: SessionGroups[],
  selectedGroups: (string | null)[],
): string {
  const icsSessions = [];

  for (const session of sessions) {
    const group = getGroupFromSessions(
      session.name,
      session.type,
      sessionsGroups,
      selectedGroups,
    );
    if (session.group == group) {
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
SUMMARY:${typeString} ${groupString} ${session.name}
END:VEVENT`);
    }
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
