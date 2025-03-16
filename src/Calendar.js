import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./index.css"; // Import CSS file

const highlightWords = [
  "break", "dinner", "good morning", "your journey", "lunch", "relaxation",
  "snack", "walking", "good night", "breakfast", "fall in love",
  "stop chasing", "study like", "5-minute rule", "bath", "sleep"
];

const convertTo24Hour = (timeStr) => {
  const [time, period] = timeStr.trim().split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
};

const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
};

const Calendar = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("/events.txt")
      .then((res) => res.text())
      .then((data) => {
        const parsedEvents = data
          .split("\n")
          .filter(line => line.includes("="))
          .map(line => {
            const [timeRange, title] = line.split("=");
            const [startTime, endTime] = timeRange.trim().split(" - ");

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { hours: startHour, minutes: startMinute } = convertTo24Hour(startTime);
            const { hours: endHour, minutes: endMinute } = convertTo24Hour(endTime);

            const startDateTime = new Date(today);
            startDateTime.setHours(startHour, startMinute, 0, 0);

            const endDateTime = new Date(today);
            endDateTime.setHours(endHour, endMinute, 0, 0);

            if (!isNaN(startDateTime) && !isNaN(endDateTime)) {
              const duration = (endDateTime - startDateTime) / (1000 * 60); 
              const eventClass = highlightWords.some(word => title.toLowerCase().includes(word))
                ? "pink-event"
                : duration < 15
                ? "small-event"
                : "yellow-event";

              return { 
                title: `${startTime} - ${endTime} | ${title.trim()} (${Math.floor(duration / 60)}h ${duration % 60}m)`, 
                start: startDateTime, 
                end: endDateTime, 
                id: title.trim(),
                extendedProps: { duration },
                className: eventClass
              };
            } else {
              console.error("Invalid date format in:", line);
              return null;
            }
          })
          .filter(event => event !== null);

        setEvents(parsedEvents);
      })
      .catch((err) => console.error("Error loading events:", err));
  }, []);

  const handleEventChange = (eventChangeInfo) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventChangeInfo.event.id) {
        const start = eventChangeInfo.event.start;
        const end = eventChangeInfo.event.end;
        const duration = (end - start) / (1000 * 60);

        return { 
          ...event, 
          start, 
          end, 
          title: `${formatTime(start)} - ${formatTime(end)} | ${event.id} (${Math.floor(duration / 60)}h ${duration % 60}m)`, 
          extendedProps: { duration },
          className: duration < 15 ? "small-event" : event.className 
        };
      }
      return event;
    });

    setEvents(updatedEvents);
  };

  const handleEventClick = (clickInfo) => {
    const newTitle = prompt("Edit event name:", clickInfo.event.title.split(" | ")[1].split(" (")[0]);
    if (newTitle) {
      const updatedEvents = events.map(event => 
        event.id === clickInfo.event.id 
          ? { 
              ...event, 
              title: `${formatTime(event.start)} - ${formatTime(event.end)} | ${newTitle} (${Math.floor((event.end - event.start) / 60000 / 60)}h ${(event.end - event.start) / 60000 % 60}m)`, 
              id: newTitle 
            } 
          : event
      );
      setEvents(updatedEvents);
    }
  };

  const saveEventsToFile = () => {
    const formattedEvents = events
.map(event => {
  const duration = (event.end - event.start) / (1000 * 60);
  return `${formatTime(event.start)} - ${formatTime(event.end)}= ${event.id} (${Math.floor(duration / 60)}h ${duration % 60}m)`;
})
      .join("\n");

    const blob = new Blob([formattedEvents], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "time.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="calendar-container">
      {/* Header with Today button and Save button */}
      <div className="button-container">
        <button onClick={saveEventsToFile} className="save-btn">
          Save Events
        </button>
      </div>

      <FullCalendar 
        plugins={[timeGridPlugin, interactionPlugin]} 
        initialView="timeGridDay"
        events={events} 
        slotMinTime="00:00:00"
        slotMaxTime="23:59:00"
        editable={true} 
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
        eventClick={handleEventClick}
        contentHeight="auto"
        height="800px"
        snapDuration="00:05:00"
        eventContent={(arg) => {
          const boxHeight = arg.event._def.ui.height;
          const fontSize = boxHeight <= 15 ? "10px" : "14px";
          return (
            <div style={{ fontSize }}>{arg.event.title}</div>
          );
        }}
      />
    </div>
  );
};

export default Calendar;
