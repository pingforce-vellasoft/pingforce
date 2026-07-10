export interface AttendanceLog {
  id: string;
  attendanceDate: string;
  employeeId: string;
  employee: {
    user: {
      firstName: string;
      lastName: string;
    }
  };
  sessions: any[];
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  employee: {
    user: {
      firstName: string;
      lastName: string;
    }
  };
  leaveType: {
    name: string;
  };
}
