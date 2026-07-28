drop index if exists app_course_attendances_active_route_idx;

create unique index if not exists app_course_attendances_identity_idx
  on app_course_attendances (unit_id, course_id, city_normalized, state, class_date);
