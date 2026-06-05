package com.rogawa.secretary.interface_adapter.vaadin;

import com.rogawa.secretary.interface_adapter.vaadin.calendar.InfiniteCalendar;
import com.vaadin.flow.component.applayout.AppLayout;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;
import java.time.LocalDate;
import java.time.YearMonth;

@Route
@PageTitle("Securetary")
public class MainView extends AppLayout {

    private final Header header;
    private final InfiniteCalendar infiniteCalendar;

    private LocalDate calenderMonth;

    public MainView(Header header, InfiniteCalendar infiniteCalendar) {
        this.header = header;
        this.infiniteCalendar = infiniteCalendar;
        this.calenderMonth = LocalDate.now();

        getElement().getThemeList().set("dark", true);
        addToNavbar(true, this.header.createHeader());
        setContent(this.infiniteCalendar);

        this.infiniteCalendar.init();

        this.infiniteCalendar.addCurrentMonthListener(e -> {
            YearMonth ym = e.getYearMonth();
            this.calenderMonth = ym.atDay(1);
            setHeaderDate();
        });

        this.header.addClickPrivBtnListener(c -> {
            scrollToMonth(this.calenderMonth.plusMonths(-1));
        });
        this.header.addClickNextBtnListener(c -> {
            scrollToMonth(this.calenderMonth.plusMonths(1));
        });
        this.header.addSelectMonthListener(c -> {
            scrollToMonth(c.getValue());
        });
    }

    private void scrollToMonth(LocalDate newMonth) {
        this.calenderMonth = newMonth;
        setHeaderDate();
        this.infiniteCalendar.scrollToDate(newMonth);
    }

    private void setHeaderDate() {
        this.header.setCalenderMonth(this.calenderMonth);
    }
}
