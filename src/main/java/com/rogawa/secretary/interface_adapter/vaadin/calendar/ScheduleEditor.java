package com.rogawa.secretary.interface_adapter.vaadin.calendar;

import com.rogawa.secretary.interface_adapter.vaadin.ScheduleForm;
import com.rogawa.secretary.domain.model.Schedule;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.ComponentEventListener;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.FlexComponent;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.shared.Registration;
import com.vaadin.flow.spring.annotation.SpringComponent;
import com.vaadin.flow.spring.annotation.UIScope;
import com.vaadin.flow.theme.lumo.LumoIcon;
import com.vaadin.flow.theme.lumo.LumoUtility;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@SpringComponent
@UIScope
public class ScheduleEditor extends Dialog {

    private final ScheduleForm scheduleForm;
    private List<Schedule> schedules;
    private LocalDate date;

    public ScheduleEditor(ScheduleForm scheduleForm) {
        this.scheduleForm = scheduleForm;

        scheduleForm.addChangeListener(c -> {
            fireEvent(new UpdateEvent(this));
            scheduleForm.close();
        });
        scheduleForm.addCancelListener(c -> {
            scheduleForm.close();
        });

        this.setWidth("98vw");
        this.setHeight("40vh");
        this.setTop("55%");
    }

    public void initScheduleEditor(LocalDate date, List<Schedule> schedules) {
        this.date = date;
        this.schedules = schedules;
        placeItems();
    }

    public void placeItems() {
        this.removeAll();
        this.setHeaderTitle(this.date.format(DateTimeFormatter.ofPattern("M月d日")) + "の予定");
        this.add(createScheduleList());
        this.add(createAddBtnItem());
    }

    private VerticalLayout createScheduleList() {
        VerticalLayout scheduleList = new VerticalLayout();
        scheduleList.setPadding(false);
        scheduleList.setSpacing(false);

        for (Integer i = 0; i < this.schedules.size(); i++) {
            HorizontalLayout scheduleCard = createScheduleItem(this.schedules.get(i));
            scheduleList.add(scheduleCard);
        }
        return scheduleList;
    }

    private HorizontalLayout createScheduleItem(Schedule schedule) {
        HorizontalLayout scheduleCard = new HorizontalLayout();

        scheduleCard.setPadding(true);
        scheduleCard.setWidthFull();
        scheduleCard.addClassNames(
                LumoUtility.Border.BOTTOM,
                LumoUtility.BoxShadow.XSMALL,
                LumoUtility.FontSize.SMALL);

        scheduleCard.add(createTimeLayout(schedule));
        scheduleCard.add(schedule.getTitle());

        scheduleCard.addClickListener(e -> {
            openScheduleForm(schedule);
        });

        return scheduleCard;
    }

    private HorizontalLayout createTimeLayout(Schedule schedule) {
        HorizontalLayout timeLayout = new HorizontalLayout();
        String allDayTxt = "終日";
        String rangeTxt = "~";

        if (schedule.getIsAllDay() == true) {
            timeLayout.add(allDayTxt);
            return timeLayout;
        }

        LocalDateTime startDate = schedule.getStartDatetime();
        LocalDateTime endDate = schedule.getEndDatetime();
        Boolean isStartToday = this.date.isEqual(startDate.toLocalDate());
        Boolean isEndToday = this.date.isEqual(endDate.toLocalDate());

        if (!isStartToday && !isEndToday) {
            timeLayout.add(allDayTxt);
            return timeLayout;
        }

        String dispTxt = "";
        String timeFormatPattern = "H:mm";

        if (isStartToday) {
            dispTxt = dispTxt + startDate.format(DateTimeFormatter.ofPattern(timeFormatPattern));
        }
        dispTxt = dispTxt + rangeTxt;
        if (isEndToday) {
            dispTxt = dispTxt + endDate.format(DateTimeFormatter.ofPattern(timeFormatPattern));
        }

        timeLayout.add(dispTxt);
        return timeLayout;
    }

    private HorizontalLayout createAddBtnItem() {
        HorizontalLayout addBtnItem = new HorizontalLayout();
        addBtnItem.setPadding(true);
        addBtnItem.setWidthFull();
        addBtnItem.setAlignItems(FlexComponent.Alignment.CENTER);

        Span icon = new Span(LumoIcon.PLUS.create());
        icon.getStyle().set("margin", "0 auto");
        addBtnItem.add(icon);

        addBtnItem.addClickListener(e -> {
            openScheduleForm(new Schedule());
        });

        return addBtnItem;
    }

    private void openScheduleForm(Schedule schedule) {
        Schedule scheduleClone = schedule.copy();

        if (scheduleClone.getId() == null) {
            LocalDateTime baseDateTime = this.date.atTime(LocalTime.now()).withMinute(0);
            scheduleClone.setStartDatetime(baseDateTime);
            scheduleClone.setEndDatetime(baseDateTime.plusHours(1));
        }

        scheduleForm.setSchedule(scheduleClone);
        scheduleForm.open();
    }

    public class UpdateEvent extends ComponentEvent<ScheduleEditor> {
        public UpdateEvent(ScheduleEditor source) {
            super(source, false);
        }
    }

    public Registration addUpdateListener(ComponentEventListener<UpdateEvent> listener) {
        return addListener(UpdateEvent.class, listener);
    }
}
