package com.rogawa.secretary.interface_adapter.vaadin;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.model.Schedule;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.ComponentEventListener;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.checkbox.Checkbox;
import com.vaadin.flow.component.combobox.ComboBox;
import com.vaadin.flow.component.datepicker.DatePicker;
import com.vaadin.flow.component.datetimepicker.DateTimePicker;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.formlayout.FormLayout;
import com.vaadin.flow.component.formlayout.FormLayout.ResponsiveStep;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.notification.Notification.Position;
import com.vaadin.flow.component.notification.NotificationVariant;
import com.vaadin.flow.component.textfield.TextArea;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.data.binder.Binder;
import com.vaadin.flow.data.value.ValueChangeMode;
import com.vaadin.flow.shared.Registration;
import com.vaadin.flow.spring.annotation.SpringComponent;
import com.vaadin.flow.spring.annotation.UIScope;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

@SpringComponent
@UIScope
public class ScheduleForm extends Dialog {

    private final ScheduleUseCase scheduleUseCase;

    TextField title = new TextField();
    Checkbox isAllDay = new Checkbox();
    DateTimePicker startDatetime = new DateTimePicker();
    DateTimePicker endDatetime = new DateTimePicker();
    DatePicker date = new DatePicker();
    DatePicker endDate = new DatePicker();
    ComboBox<String> owner = new ComboBox<>();
    TextArea description = new TextArea();

    Button cancelButton = new Button("やめる");
    Button saveButton = new Button("保存");
    Button deleteButton = new Button("削除");

    private final Binder<Schedule> binder = new Binder<>(Schedule.class);

    public ScheduleForm(ScheduleUseCase scheduleUseCase) {
        this.scheduleUseCase = scheduleUseCase;

        binder.forField(title).bind(Schedule::getTitle, Schedule::setTitle);
        binder.forField(isAllDay).bind(Schedule::getIsAllDay, Schedule::setIsAllDay);
        binder.forField(date).bind(
                (schedule) -> {
                    if (schedule.getStartDatetime() != null) {
                        return schedule.getStartDatetime().toLocalDate();
                    } else {
                        return null;
                    }
                },
                (schedule, date) -> {
                    if (date != null) {
                        schedule.setStartDatetime(date.atStartOfDay());
                    } else {
                        schedule.setStartDatetime(null);
                    }
                });
        binder.forField(endDate).bind(
                (schedule) -> {
                    if (schedule.getEndDatetime() != null) {
                        return schedule.getEndDatetime().toLocalDate();
                    } else {
                        return null;
                    }
                },
                (schedule, endDate) -> {
                    if (endDate != null) {
                        schedule.setEndDatetime(endDate.atStartOfDay());
                    } else {
                        schedule.setEndDatetime(null);
                    }
                });
        binder.forField(startDatetime).bind(Schedule::getStartDatetime,
                (schedule, startDatetime) -> {
                    schedule.setStartDatetime(startDatetime);
                    LocalDateTime currentStartDatetime = startDatetime;
                    LocalDateTime currentEndDatetime = schedule.getEndDatetime();
                    if (!currentStartDatetime.isBefore(currentEndDatetime)) {
                        LocalDateTime validDatetime = currentStartDatetime.plusMinutes(30);
                        endDatetime.setValue(validDatetime);
                        schedule.setEndDatetime(validDatetime);
                    }
                });
        binder.forField(endDatetime).bind(Schedule::getEndDatetime,
                (schedule, endDatetime) -> {
                    schedule.setEndDatetime(endDatetime);
                    LocalDateTime currentStartDatetime = schedule.getStartDatetime();
                    LocalDateTime currentEndDatetime = endDatetime;
                    if (!currentStartDatetime.isBefore(currentEndDatetime)) {
                        LocalDateTime validDatetime = currentEndDatetime.minusMinutes(30);
                        startDatetime.setValue(validDatetime);
                        schedule.setStartDatetime(validDatetime);
                    }
                });
        binder.forField(owner).bind(Schedule::getOwner, Schedule::setOwner);
        binder.forField(description).bind(Schedule::getDescription, Schedule::setDescription);

        cancelButton.addClickListener(e -> cancel());
        saveButton.addClickListener(e -> save());
        deleteButton.addClickListener(e -> delete());

        deleteButton.setVisible(false);

        createUI();
    }

    private void createUI() {
        FormLayout formLayout = new FormLayout();

        title.setLabel("タイトル*");

        isAllDay.setLabel("終日");
        isAllDay.addValueChangeListener(e -> {
            toggleDateTimeForm(e.getValue());
        });

        date.setLabel("開始日*");
        endDate.setLabel("終了日*");

        startDatetime.setStep(Duration.ofMinutes(30));
        startDatetime.setLabel("開始日時*");
        endDatetime.setStep(Duration.ofMinutes(30));
        endDatetime.setLabel("終了日時*");

        int CHAR_LIMIT = 200;
        description.setLabel("説明");
        description.setMaxLength(CHAR_LIMIT);
        description.setValueChangeMode(ValueChangeMode.EAGER);
        description.addValueChangeListener(e -> {
            e.getSource().setHelperText(e.getValue().length() + "/" + CHAR_LIMIT);
        });

        owner.setLabel("予定の所有者*");
        owner.setItems("ななほ", "りょうま", "りょうまななほ", "他");
        owner.setAllowCustomValue(true);

        formLayout.add(title, owner, isAllDay, startDatetime, date, endDatetime, endDate, description);

        formLayout.setResponsiveSteps(
                new ResponsiveStep("0", 1),
                new ResponsiveStep("500px", 2));
        formLayout.setColspan(isAllDay, 2);
        formLayout.setColspan(description, 2);

        cancelButton.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
        cancelButton.getStyle().set("margin-right", "auto");
        deleteButton.addThemeVariants(ButtonVariant.LUMO_PRIMARY, ButtonVariant.LUMO_ERROR);
        saveButton.addThemeVariants(ButtonVariant.LUMO_PRIMARY, ButtonVariant.LUMO_SUCCESS);

        this.add(formLayout);
        this.getFooter().add(cancelButton);
        this.getFooter().add(deleteButton);
        this.getFooter().add(saveButton);
    }

    private void toggleDateTimeForm(Boolean isAllDay) {
        date.setVisible(isAllDay);
        endDate.setVisible(isAllDay);
        startDatetime.setVisible(!isAllDay);
        endDatetime.setVisible(!isAllDay);
    }

    private void cancel() {
        System.out.println("#### Attempt to cancel the schedule creation");
        setSchedule(null);
        fireEvent(new CancelEvent(this));
        System.out.println("#### Schedule creation was canceled");
    }

    private void save() {
        System.out.println("#### Attempt to save schedule");
        binder.getBean().logWrite();
        try {
            if (binder.isValid()) {
                scheduleUseCase.createSchedule(binder.getBean());
                setSchedule(null);
                fireEvent(new ChangeEvent(this));
            }
            System.out.println("#### Schedule saved");
            Notification notification = Notification.show("予定を保存したよ", 2000, Position.TOP_END);
            notification.addThemeVariants(NotificationVariant.LUMO_SUCCESS);
        } catch (Exception e) {
            Notification notification = Notification.show("「*」がついている項目は必須だよ", 2000, Position.TOP_END);
            notification.addThemeVariants(NotificationVariant.LUMO_ERROR);
            System.err.println("#### Failed to save schedule");
            System.err.println(e);
        }
    }

    private void delete() {
        System.out.println("#### Attempt to delete schedule");
        scheduleUseCase.deleteSchedule(binder.getBean().getId());
        setSchedule(null);
        fireEvent(new ChangeEvent(this));
        System.out.println("#### Schedule deleted");
    }

    public void setSchedule(Schedule schedule) {
        binder.setBean(schedule);
        toggleDateTimeForm(isAllDay.getValue());
        if (Objects.nonNull(schedule)) {
            title.focus();
            this.deleteButton.setVisible(schedule.getId() != null);
        }
    }

    public class ChangeEvent extends ComponentEvent<ScheduleForm> {
        public ChangeEvent(ScheduleForm source) {
            super(source, false);
        }
    }

    public Registration addChangeListener(ComponentEventListener<ChangeEvent> listener) {
        return addListener(ChangeEvent.class, listener);
    }

    public class CancelEvent extends ComponentEvent<ScheduleForm> {
        public CancelEvent(ScheduleForm source) {
            super(source, false);
        }
    }

    public Registration addCancelListener(ComponentEventListener<CancelEvent> listener) {
        return addListener(CancelEvent.class, listener);
    }
}
