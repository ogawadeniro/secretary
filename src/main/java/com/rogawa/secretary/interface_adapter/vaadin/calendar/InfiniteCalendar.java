package com.rogawa.secretary.interface_adapter.vaadin.calendar;

import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import com.vaadin.flow.component.ClientCallable;
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
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SpringComponent
@UIScope
public class InfiniteCalendar extends VerticalLayout {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleEditor scheduleEditor;

    private static final DayOfWeek FIRST_DAY_OF_WEEK = DayOfWeek.SUNDAY;
    private static final int INITIAL_WEEKS = 16;
    private static final int LOAD_CHUNK_WEEKS = 3;
    private static final int SCROLL_THRESHOLD = 500;
    private static final int MAX_WEEKS = 60;

    private LocalDate firstVisibleDate;
    private LocalDate lastVisibleDate;
    private List<HorizontalLayout> weekRows = new ArrayList<>();
    private List<DateCard> allDateCards = new ArrayList<>();
    private boolean isLoading = false;
    private boolean needsCoolDown = false;
    private boolean isInitialized = false;
    private YearMonth lastReportedMonth;

    public InfiniteCalendar(ScheduleRepository scheduleRepository, ScheduleEditor scheduleEditor) {
        this.scheduleRepository = scheduleRepository;
        this.scheduleEditor = scheduleEditor;

        getStyle().set("overflow-y", "auto");
        getStyle().set("height", "100%");
        setPadding(false);
        setSpacing(false);

        scheduleEditor.addUpdateListener(e -> {
            reloadSchedules();
        });
    }

    public void init() {
        initAround(LocalDate.now());
    }

    public void scrollToDate(LocalDate date) {
        for (HorizontalLayout row : weekRows) {
            DateCard firstCard = (DateCard) row.getComponentAt(0);
            LocalDate rowStart = firstCard.getDate();
            LocalDate rowEnd = rowStart.plusDays(6);
            if (!date.isBefore(rowStart) && !date.isAfter(rowEnd)) {
                row.getElement().executeJs("this.scrollIntoView(true)");
                return;
            }
        }
        initAround(date);
    }

    private void initAround(LocalDate center) {
        LocalDate weekStart = center.with(TemporalAdjusters.previousOrSame(FIRST_DAY_OF_WEEK));

        firstVisibleDate = weekStart.minusDays((long) INITIAL_WEEKS / 2 * 7);
        lastVisibleDate = weekStart.plusDays((long) (INITIAL_WEEKS / 2) * 7 - 1);

        removeAll();
        weekRows.clear();
        allDateCards.clear();
        needsCoolDown = false;

        LocalDate cursor = firstVisibleDate;
        while (!cursor.isAfter(lastVisibleDate)) {
            addWeekRow(cursor);
            cursor = cursor.plusDays(7);
        }

        loadSchedules(firstVisibleDate, lastVisibleDate);

        if (!isInitialized) {
            initScrollListener();
            isInitialized = true;
        }

        int centerWeekIndex = INITIAL_WEEKS / 2;
        if (centerWeekIndex < weekRows.size()) {
            weekRows.get(centerWeekIndex).getElement().executeJs(
                    "setTimeout(() => this.scrollIntoView(true), 100)");
        }

        reportCurrentMonth(center);
    }

    private void addWeekRow(LocalDate weekStartDate) {
        HorizontalLayout weekRow = createWeekRow(weekStartDate);
        add(weekRow);
        weekRows.add(weekRow);
    }

    private void prependWeekRow(LocalDate weekStartDate) {
        HorizontalLayout weekRow = createWeekRow(weekStartDate);
        addComponentAsFirst(weekRow);
        weekRows.add(0, weekRow);
    }

    private HorizontalLayout createWeekRow(LocalDate weekStartDate) {
        HorizontalLayout weekRow = new HorizontalLayout();
        weekRow.setPadding(false);
        weekRow.setSpacing(false);
        weekRow.setWidth("100%");

        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStartDate.plusDays(i);
            DateCard card = new DateCard("calc(100% / 7)", scheduleEditor);
            card.setDate(date);
            card.render();
            weekRow.add(card);
            allDateCards.add(card);
        }
        return weekRow;
    }

    private void reloadSchedules() {
        loadSchedules(firstVisibleDate, lastVisibleDate);
    }

    private void loadSchedules(LocalDate rangeStart, LocalDate rangeEnd) {
        List<Schedule> schedules = scheduleRepository.findAllByDateRange(
                rangeStart.atStartOfDay(),
                rangeEnd.atTime(23, 59));

        for (DateCard card : allDateCards) {
            card.removeAllSchedules();
        }

        Map<LocalDate, List<Schedule>> scheduleMap = new HashMap<>();
        for (Schedule s : schedules) {
            LocalDate start = s.getStartDatetime().toLocalDate();
            LocalDate end = s.getEndDatetime().toLocalDate();
            for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
                scheduleMap.computeIfAbsent(d, k -> new ArrayList<>()).add(s);
            }
        }

        for (DateCard card : allDateCards) {
            List<Schedule> daySchedules = scheduleMap.get(card.getDate());
            if (daySchedules != null) {
                for (Schedule s : daySchedules) {
                    card.addSchedule(s);
                }
            }
            card.render();
        }
    }

    @ClientCallable
    public void onScrollPosition(double scrollTop, double scrollHeight, double clientHeight) {
        if (isLoading) {
            return;
        }

        boolean nearTop = scrollTop <= SCROLL_THRESHOLD;
        boolean nearBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD;

        if (!nearTop && !nearBottom) {
            needsCoolDown = false;
        }

        if (needsCoolDown) {
            updateVisibleMonth(scrollTop, clientHeight);
            return;
        }

        if (nearTop) {
            needsCoolDown = true;
            loadPreviousWeeks(scrollTop);
        }
        if (nearBottom) {
            needsCoolDown = true;
            loadNextWeeks();
        }

        cleanupDistantWeeks();
        updateVisibleMonth(scrollTop, clientHeight);
    }

    private void loadPreviousWeeks(double scrollTop) {
        int chunkDays = LOAD_CHUNK_WEEKS * 7;
        LocalDate newFirst = firstVisibleDate.minusDays(chunkDays);
        isLoading = true;

        for (int i = 0; i < LOAD_CHUNK_WEEKS; i++) {
            LocalDate weekStart = firstVisibleDate.minusDays((long) (i + 1) * 7);
            prependWeekRow(weekStart);
        }
        firstVisibleDate = newFirst;

        double addedHeight = estimateWeekHeight() * LOAD_CHUNK_WEEKS;
        double newScrollTop = scrollTop + addedHeight;
        getElement().executeJs(
                "setTimeout(() => { this.scrollTop = %f; }, 50)".formatted(newScrollTop));

        loadSchedules(firstVisibleDate, lastVisibleDate);
        isLoading = false;
    }

    private void loadNextWeeks() {
        int chunkDays = LOAD_CHUNK_WEEKS * 7;
        LocalDate newLast = lastVisibleDate.plusDays(chunkDays);
        isLoading = true;

        for (int i = 0; i < LOAD_CHUNK_WEEKS; i++) {
            LocalDate weekStart = lastVisibleDate.plusDays(1 + (long) i * 7);
            addWeekRow(weekStart);
        }
        lastVisibleDate = newLast;

        loadSchedules(firstVisibleDate, lastVisibleDate);
        isLoading = false;
    }

    private void updateVisibleMonth(double scrollTop, double clientHeight) {
        if (weekRows.isEmpty()) {
            return;
        }
        int centerWeekIndex = (int) ((scrollTop + clientHeight / 2) / estimateWeekHeight());
        centerWeekIndex = Math.max(0, Math.min(centerWeekIndex, weekRows.size() - 1));

        DateCard firstCard = (DateCard) weekRows.get(centerWeekIndex).getComponentAt(0);
        reportCurrentMonth(firstCard.getDate());
    }

    private void reportCurrentMonth(LocalDate date) {
        YearMonth current = YearMonth.from(date);
        if (!current.equals(lastReportedMonth)) {
            lastReportedMonth = current;
            fireEvent(new CurrentMonthEvent(this, current));
        }
    }

    private void cleanupDistantWeeks() {
        while (weekRows.size() > MAX_WEEKS) {
            HorizontalLayout oldestRow = weekRows.get(weekRows.size() - 1);
            for (int i = 0; i < 7; i++) {
                allDateCards.remove(oldestRow.getComponentAt(i));
            }
            remove(oldestRow);
            weekRows.remove(weekRows.size() - 1);
        }
    }

    private double estimateWeekHeight() {
        return 120;
    }

    private void initScrollListener() {
        getElement().executeJs("""
            const el = this;
            let ticking = false;
            el.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        el.$server.onScrollPosition(
                            el.scrollTop, el.scrollHeight, el.clientHeight
                        );
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        """);
    }

    public class CurrentMonthEvent extends ComponentEvent<InfiniteCalendar> {
        private final YearMonth yearMonth;

        public CurrentMonthEvent(InfiniteCalendar source, YearMonth yearMonth) {
            super(source, false);
            this.yearMonth = yearMonth;
        }

        public YearMonth getYearMonth() {
            return yearMonth;
        }
    }

    public Registration addCurrentMonthListener(
            ComponentEventListener<CurrentMonthEvent> listener) {
        return addListener(CurrentMonthEvent.class, listener);
    }
}
