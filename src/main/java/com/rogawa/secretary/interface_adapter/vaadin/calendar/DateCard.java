package com.rogawa.secretary.interface_adapter.vaadin.calendar;

import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.interface_adapter.util.OwnerColorUtil;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.ComponentEventListener;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.FlexComponent;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.shared.Registration;
import com.vaadin.flow.spring.annotation.SpringComponent;
import com.vaadin.flow.spring.annotation.UIScope;
import com.vaadin.flow.theme.lumo.LumoUtility;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@SpringComponent
@UIScope
public class DateCard extends VerticalLayout {

    private LocalDate date;
    private String widthStyleStr;
    private List<Schedule> schedules = new ArrayList<>();
    private ScheduleEditor scheduleEditor;

    public DateCard(String widthStyleStr, ScheduleEditor scheduleEditor) {
        this.widthStyleStr = widthStyleStr;
        this.scheduleEditor = scheduleEditor;

        this.addClickListener(e -> {
            this.scheduleEditor.initScheduleEditor(this.date, this.schedules);
            this.scheduleEditor.open();
        });

        this.setPadding(false);
        this.setSpacing(false);
        this.getStyle().set("width", this.widthStyleStr);
        this.addClassNames(
                LumoUtility.Border.LEFT,
                LumoUtility.Border.TOP,
                LumoUtility.BoxShadow.XSMALL,
                LumoUtility.FontSize.XSMALL);
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public LocalDate getDate() {
        return this.date;
    }

    public void addSchedule(Schedule schedule) {
        this.schedules.add(schedule);
    }

    public List<Schedule> getSchedules() {
        return this.schedules;
    }

    public void removeAllSchedules() {
        this.schedules = new ArrayList<>();
    }

    public void initDateCard(LocalDate calenderMonth) {
        placeItems(calenderMonth);
    }

    private void placeItems(LocalDate calenderMonth) {
        this.removeAll();

        if (this.date.equals(LocalDate.now())) {
            this.addClassName(LumoUtility.Background.PRIMARY_10);
        } else if (this.date.getMonth() == calenderMonth.getMonth()) {
            this.removeClassNames(LumoUtility.Background.PRIMARY_10);
            this.addClassName(LumoUtility.Background.CONTRAST_5);
        } else {
            this.removeClassNames(LumoUtility.Background.CONTRAST_5);
        }

        this.add(createDateChip());

        for (Integer i = 0; i < schedules.size(); i++) {
            String title = schedules.get(i).getTitle();
            String owner = schedules.get(i).getOwner();
            this.add(createTitleChip(title, owner));
        }
    }

    public HorizontalLayout createDateChip() {
        HorizontalLayout dateChip = new HorizontalLayout();
        dateChip.setHeight("1rem");
        dateChip.getStyle().set("line-height", "1rem");
        dateChip.getStyle().set("padding-left", "0.1rem");

        String dateTxt = this.date.format(DateTimeFormatter.ofPattern("d"));
        Span dateSpan = new Span(dateTxt);

        if (this.date.getDayOfWeek() == DayOfWeek.SATURDAY) {
            dateSpan.addClassName(LumoUtility.TextColor.PRIMARY);
        } else if (this.date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            dateSpan.addClassName(LumoUtility.TextColor.ERROR);
        }

        dateChip.add(dateSpan);
        return dateChip;
    }

    public HorizontalLayout createTitleChip(String title, String owner) {
        HorizontalLayout titleChip = new HorizontalLayout();
        titleChip.setHeight("1rem");
        titleChip.setWidth("100%");
        titleChip.setPadding(false);
        titleChip.setAlignItems(FlexComponent.Alignment.START);
        titleChip.getStyle().set("background-color", OwnerColorUtil.generateOwnerColorCode(owner));
        titleChip.getStyle().set("line-height", "1rem");
        titleChip.getStyle().set("border-radius", "2px");
        titleChip.getStyle().set("padding-left", "0.1rem");
        titleChip.getStyle().set("margin-bottom", "0.1rem");
        titleChip.addClassNames(
                LumoUtility.Whitespace.NOWRAP,
                LumoUtility.TextOverflow.CLIP,
                LumoUtility.Overflow.HIDDEN);

        Span titleSpan = new Span(title);
        titleSpan.getStyle().set("font-size", "0.7rem");
        titleSpan.addClassNames(LumoUtility.FontWeight.BOLD);

        titleChip.add(titleSpan);
        return titleChip;
    }

    public class UpdateEvent extends ComponentEvent<DateCard> {
        public UpdateEvent(DateCard source) {
            super(source, false);
        }
    }

    public Registration addUpdateListener(ComponentEventListener<UpdateEvent> listener) {
        return addListener(UpdateEvent.class, listener);
    }
}
