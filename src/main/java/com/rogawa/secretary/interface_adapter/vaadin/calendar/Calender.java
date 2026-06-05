package com.rogawa.secretary.interface_adapter.vaadin.calendar;

import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.ComponentEventListener;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.shared.Registration;
import com.vaadin.flow.spring.annotation.SpringComponent;
import com.vaadin.flow.spring.annotation.UIScope;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

@SpringComponent
@UIScope
public class Calender extends VerticalLayout {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleEditor scheduleEditor;

    private static final Integer WEEK_DAY_CNT = 7;
    private static final Integer MAX_DRAWING_DATES = 42;

    private LocalDate firstDayOfCalender;
    private LocalDate[] drawingDates;
    private List<Schedule> drawingSchedules = new ArrayList<>();
    private List<DateCard> dateCards = new ArrayList<>();
    private DateCard selectedDateCard;
    private LocalDate targetYearMonth;
    private DayOfWeek fixedDayOfWeek;

    public Calender(ScheduleRepository scheduleRepository, ScheduleEditor scheduleEditor) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleEditor = scheduleEditor;

        for (Integer i = 0; i < MAX_DRAWING_DATES; i++) {
            DateCard dateCard = new DateCard("calc(100% / " + WEEK_DAY_CNT + ")", scheduleEditor);
            dateCard.addClickListener(e -> {
                this.selectedDateCard = dateCard;
            });
            this.dateCards.add(dateCard);
        }

        scheduleEditor.addUpdateListener(e -> {
            System.out.println("### updateEvent fired (scheduleEditor)");
            fireEvent(new UpdateEvent(this));

            LocalDate date = this.selectedDateCard.getDate();
            List<Schedule> schedules = this.selectedDateCard.getSchedules();
            this.scheduleEditor.initScheduleEditor(date, schedules);
        });
    }

    public void initCalender(LocalDate targetYearMonth, DayOfWeek fixedDayOfWeek) {
        System.out.println("### initCalender(" + targetYearMonth + ") ########################");
        this.targetYearMonth = targetYearMonth;
        this.fixedDayOfWeek = fixedDayOfWeek;
        this.firstDayOfCalender = searchFirstDayOfCalender(targetYearMonth);

        this.drawingDates = getDrawingDates();
        setDateCardsDate();
        this.drawingSchedules = retrieveDrawingSchedules();
        setDateCardsSchedule();
        placeDateCards();
    }

    private void placeDateCards() {
        this.removeAll();
        this.setPadding(false);
        this.setSpacing(false);
        this.getStyle().set("width", "100%");
        this.getStyle().set("height", "100%");

        for (Integer i = 0; i < MAX_DRAWING_DATES / WEEK_DAY_CNT; i++) {
            HorizontalLayout weekLayout = new HorizontalLayout();
            weekLayout.setPadding(false);
            weekLayout.setSpacing(false);
            weekLayout.getStyle().set("width", "100%");
            weekLayout.getStyle().set("height", "calc(100% / " + MAX_DRAWING_DATES / WEEK_DAY_CNT + ")");

            for (Integer j = 0; j < WEEK_DAY_CNT; j++) {
                DateCard dateCard = this.dateCards.get(i * WEEK_DAY_CNT + j);
                dateCard.initDateCard(targetYearMonth);
                weekLayout.add(dateCard);
            }
            this.add(weekLayout);
        }
    }

    private void setDateCardsDate() {
        for (Integer i = 0; i < MAX_DRAWING_DATES; i++) {
            LocalDate date = this.drawingDates[i];
            this.dateCards.get(i).setDate(date);
        }
    }

    private void setDateCardsSchedule() {
        for (Integer i = 0; i < MAX_DRAWING_DATES; i++) {
            dateCards.get(i).removeAllSchedules();
        }

        for (Integer i = 0; i < this.drawingSchedules.size(); i++) {
            Schedule schedule = drawingSchedules.get(i);
            LocalDate scheduleStartDate = schedule.getStartDatetime().toLocalDate();
            LocalDate scheduleEndDate = schedule.getEndDatetime().toLocalDate();
            Integer startIdx = scheduleStartDate.getDayOfYear() - firstDayOfCalender.getDayOfYear();
            Integer scheduleRange = scheduleEndDate.getDayOfYear() - scheduleStartDate.getDayOfYear() + 1;

            for (Integer j = 0; j < scheduleRange; j++) {
                Integer targetDayIdx = startIdx + j;
                if (targetDayIdx > -1 && targetDayIdx < MAX_DRAWING_DATES) {
                    dateCards.get(startIdx + j).addSchedule(schedule);
                }
            }
        }
    }

    private List<Schedule> retrieveDrawingSchedules() {
        LocalDateTime startDay = this.drawingDates[0].atStartOfDay();
        LocalDateTime endDay = this.drawingDates[MAX_DRAWING_DATES - 1].atStartOfDay();
        return scheduleRepository.findAllByDateRange(startDay, endDay);
    }

    private LocalDate[] getDrawingDates() {
        LocalDate[] drawingDates = new LocalDate[MAX_DRAWING_DATES];
        for (Integer i = 0; i < MAX_DRAWING_DATES; i++) {
            drawingDates[i] = firstDayOfCalender.plusDays(i);
        }
        return drawingDates;
    }

    private LocalDate searchFirstDayOfCalender(LocalDate targetYearMonth) {
        LocalDate firstDayOfMonth = targetYearMonth.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate firstDayOfCalender = firstDayOfMonth;
        if (firstDayOfMonth.getDayOfWeek() != this.fixedDayOfWeek) {
            firstDayOfCalender = firstDayOfMonth.with(TemporalAdjusters.previous(this.fixedDayOfWeek));
        }
        return firstDayOfCalender;
    }

    public class UpdateEvent extends ComponentEvent<Calender> {
        public UpdateEvent(Calender source) {
            super(source, false);
        }
    }

    public Registration addUpdateListener(ComponentEventListener<UpdateEvent> listener) {
        return addListener(UpdateEvent.class, listener);
    }
}
