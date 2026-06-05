package com.rogawa.secretary.interface_adapter.vaadin;

import com.vaadin.flow.component.Component;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.ComponentEventListener;
import com.vaadin.flow.component.EventData;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.html.Div;
import com.vaadin.flow.component.html.H3;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.listbox.ListBox;
import com.vaadin.flow.component.orderedlayout.FlexComponent;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.popover.Popover;
import com.vaadin.flow.data.renderer.ComponentRenderer;
import com.vaadin.flow.shared.Registration;
import com.vaadin.flow.spring.annotation.SpringComponent;
import com.vaadin.flow.spring.annotation.UIScope;
import com.vaadin.flow.theme.lumo.LumoUtility;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@SpringComponent
@UIScope
public class Header extends HorizontalLayout {

    private LocalDate calenderMonth;

    private H3 viewTitle;
    private final ListBox<LocalDate> monthSelector;
    private final Popover monthSelectorView;
    private Boolean isEnableMonthSelectorEvent;

    public Header() {
        viewTitle = new H3();
        this.monthSelectorView = new Popover();
        this.monthSelector = createMonthSelector();
    }

    public void setCalenderMonth(LocalDate date) {
        this.calenderMonth = date;
        String headerTitle = DateTimeFormatter.ofPattern("yyyy年M月").format(this.calenderMonth);
        viewTitle.setText(headerTitle);
        initMonthSelector();
    }

    public Component createHeader() {
        monthSelectorView.setTarget(this.viewTitle);
        monthSelectorView.add(this.monthSelector);

        Span privButton = new Span(VaadinIcon.CARET_LEFT.create());
        privButton.addClickListener(e -> {
            System.out.println("### privButton Clicked ###");
            fireEvent(new ClickPrivBtnEvent(this));
        });
        Span nextButton = new Span(VaadinIcon.CARET_RIGHT.create());
        nextButton.addClickListener(e -> {
            System.out.println("### nextButton Clicked ###");
            fireEvent(new ClickNextBtnEvent(this));
        });

        HorizontalLayout navItemSpacer = new HorizontalLayout();
        navItemSpacer.setAlignItems(FlexComponent.Alignment.CENTER);
        navItemSpacer.setClassName("navbar-item");
        navItemSpacer.add(privButton, viewTitle, nextButton);
        navItemSpacer.add(monthSelectorView);

        HorizontalLayout layout = new HorizontalLayout();
        layout.setId("header");
        layout.getThemeList().set("dark", true);
        layout.setWidthFull();
        layout.setAlignItems(FlexComponent.Alignment.CENTER);
        layout.setFlexGrow(1, navItemSpacer);
        layout.setPadding(false);
        layout.addClassNames(
                LumoUtility.Border.TOP,
                LumoUtility.Padding.SMALL);
        layout.add(navItemSpacer);

        return layout;
    }

    private ListBox<LocalDate> createMonthSelector() {
        ListBox<LocalDate> monthSelector = new ListBox<>();
        monthSelector.setRenderer(new ComponentRenderer<>(date -> {
            Div listItem = new Div();
            String monthTxt = date.format(DateTimeFormatter.ofPattern("yyyy年 M月"));
            listItem.add(monthTxt);
            return listItem;
        }));
        monthSelector.addValueChangeListener(e -> {
            if (!isEnableMonthSelectorEvent) {
                return;
            }
            this.monthSelectorView.close();
            fireEvent(new SelectMonthEvent(this, e.getValue()));
        });
        return monthSelector;
    }

    private void initMonthSelector() {
        Integer displayMonthRange = 24;
        Integer monthOffset = displayMonthRange / 2;
        LocalDate startMonth = this.calenderMonth.minusMonths(monthOffset);

        LocalDate[] monthItems = new LocalDate[displayMonthRange];
        for (Integer i = 0; i < displayMonthRange; i++) {
            monthItems[i] = startMonth.plusMonths(i);
        }

        this.isEnableMonthSelectorEvent = false;
        this.monthSelector.setItems(monthItems);
        this.monthSelector.setValue(this.calenderMonth);
        this.isEnableMonthSelectorEvent = true;
    }

    public class UpdateEvent extends ComponentEvent<Header> {
        public UpdateEvent(Header source) {
            super(source, false);
        }
    }

    public Registration addUpdateListener(ComponentEventListener<UpdateEvent> listener) {
        return addListener(UpdateEvent.class, listener);
    }

    public class ClickPrivBtnEvent extends ComponentEvent<Header> {
        public ClickPrivBtnEvent(Header source) {
            super(source, false);
        }
    }

    public Registration addClickPrivBtnListener(ComponentEventListener<ClickPrivBtnEvent> listener) {
        return addListener(ClickPrivBtnEvent.class, listener);
    }

    public class ClickNextBtnEvent extends ComponentEvent<Header> {
        public ClickNextBtnEvent(Header source) {
            super(source, false);
        }
    }

    public Registration addClickNextBtnListener(ComponentEventListener<ClickNextBtnEvent> listener) {
        return addListener(ClickNextBtnEvent.class, listener);
    }

    public class SelectMonthEvent extends ComponentEvent<Header> {
        private final LocalDate month;

        public SelectMonthEvent(Header source, @EventData("event.month") LocalDate month) {
            super(source, false);
            this.month = month;
        }

        public LocalDate getValue() {
            return this.month;
        }
    }

    public Registration addSelectMonthListener(ComponentEventListener<SelectMonthEvent> listener) {
        return addListener(SelectMonthEvent.class, listener);
    }
}
