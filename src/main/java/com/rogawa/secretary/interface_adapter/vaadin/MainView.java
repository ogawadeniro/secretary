package com.rogawa.secretary.interface_adapter.vaadin;

import com.rogawa.secretary.interface_adapter.vaadin.calendar.Calender;
import com.vaadin.flow.component.applayout.AppLayout;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import java.time.DayOfWeek;
import java.time.LocalDate;

@Route
@PageTitle("Securetary")
public class MainView extends AppLayout {

    private final Header header;
    private final Calender calender;

    private LocalDate calenderMonth;
    private static final DayOfWeek FIXED_DAY_OF_WEEK = DayOfWeek.SUNDAY;

    public MainView(Header header, Calender calender) {
        this.header = header;
        this.calender = calender;
        this.calenderMonth = LocalDate.now();

        getElement().getThemeList().set("dark", true);
        addToNavbar(true, this.header.createHeader());
        setContent(this.calender);

        changeViewMonth(this.calenderMonth);

        this.header.addUpdateListener(c -> {
        });
        this.header.addClickPrivBtnListener(c -> {
            changeViewMonth(this.calenderMonth.plusMonths(-1));
        });
        this.header.addClickNextBtnListener(c -> {
            changeViewMonth(this.calenderMonth.plusMonths(1));
        });
        this.header.addSelectMonthListener(c -> {
            changeViewMonth(c.getValue());
        });
        this.calender.addUpdateListener(c -> {
            initCalender();
        });
    }

    private void changeViewMonth(LocalDate newMonth) {
        this.calenderMonth = newMonth;
        setHeaderDate();
        initCalender();
    }

    private void setHeaderDate() {
        this.header.setCalenderMonth(this.calenderMonth);
    }

    private void initCalender() {
        this.calender.initCalender(this.calenderMonth, FIXED_DAY_OF_WEEK);
    }
}
