import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      dashboard: {
        title: "Dashboard",
        search: "Search...",
        dueNotice: "Due Fee Notice",
        dueNoticeDesc: "Currently <1>{{count}} students</1> have monthly fees due. Take action quickly.",
        viewDueList: "View Due List",
        startBatchTitle: "Create a Batch",
        startBatchDesc: "Create a batch to manage students, fees, and exams.",
        createBatch: "Create Batch",
        stats: {
          totalStudents: "Total Students",
          batches: "Batches",
          offlineExams: "Offline Exams",
          pendingResults: "Pending Results",
          attendanceRate: "Attendance Rate",
          totalCollected: "Total Collected",
          studentsWithDues: "Students with Dues"
        },
        quickActions: {
          takeAttendance: "Take Attendance",
          takeAttendanceDesc: "Record daily attendance",
          offlineExams: "Offline Exams",
          offlineExamsDesc: "Manage exam results",
          feeManagement: "Fee Management",
          feeManagementDesc: "Track payments",
          students: "Students",
          studentsDesc: "Manage students"
        },
        recentExams: "Recent Offline Exams",
        recentAttendance: "Recent Attendance",
        viewAll: "View All",
        noExams: "No offline exams yet",
        noAttendance: "No attendance records yet",
        buyTokens: "Buy Tokens",
        smsTokens: "SMS Tokens",
        sentThisMonth: "{{count}} sent this month",
        available: "Available"
      },
      students: {
        title: "Student Directory",
        subtitle: "Manage and view all students in your institution.",
        export: "Export",
        addStudent: "Add Student",
        allStudents: "All Students",
        applications: "Applications",
        searchPlaceholder: "Search by name or roll no...",
        filter: "Filter",
        allGrades: "All Grades",
        table: {
          student: "Student",
          whatsapp: "WhatsApp",
          batchGrade: "Batch & Grade",
          rollNo: "Roll No",
          contact: "Contact",
          status: "Status",
          date: "Date",
          actions: "Actions"
        },
        addModal: {
          title: "Add New Student",
          photo: "Student Photo",
          photoDesc: "Click to upload (Max 500KB) or enter URL below",
          photoPlaceholder: "Or paste Photo URL here...",
          name: "Student Name",
          rollNo: "Roll No.",
          dob: "Date of Birth",
          birthCert: "Birth Certificate No.",
          nid: "NID Number",
          fatherName: "Father's Name",
          motherName: "Mother's Name",
          guardianPhone: "Phone Number",
          joinDate: "Join Date",
          batch: "Batch",
          admissionFee: "Admission Fee",
          monthlyFee: "Monthly Fee",
          subjectGroup: "Subject Group",
          feeType: "Default Fee Type",
          address: "Detailed Address",
          addressPlaceholder: "Enter full address...",
          skipAdmissionFee: "Mark admission fee as already paid",
          skipMonthlyFee: "Mark current month fee as already paid",
          successMsg: "Congratulations! {{name}}'s admission is successful.\nAdmission Fee: ৳{{aFee}}\nMonthly Fee: ৳{{mFee}}\nTotal Received: ৳{{total}}\nThank you, Manage My Batch.",
        },
        importInstructions: {
          title: "Import Instructions",
          description: "To import multiple students at once, use a CSV file with correctly mapped headers. You can download our template below to ensure accuracy.",
          requiredColumns: "Required Columns (CSV Headers):",
          downloadTemplate: "Download CSV Template",
          nameDesc: "Full student name",
          phoneDesc: "11-digit mobile number",
          batchDesc: "Exact batch name (Must match your existing batches)",
          rollDesc: "Student roll or ID number"
        }
      },
      batches: {
        title: "Batches",
        subtitle: "Organize students into groups for better management.",
        addBatch: "Add Batch",
        createBatch: "Create Batch",
        searchPlaceholder: "Search batches...",
        filter: "Filter",
        viewDetails: "View Details",
        created: "Created",
        month: "month",
        table: {
          name: "Batch Name",
          grade: "Grade",
          students: "Students",
          fees: "Fees (Admission/Monthly)",
          actions: "Actions"
        },
        addModal: {
          title: "Add Batch",
          name: "Batch Name",
          namePlaceholder: "e.g. Turbo 2025-1, Morning Batch",
          description: "Description",
          descriptionPlaceholder: "Short description",
          color: "Color",
          admissionFee: "Admission Fee",
          monthlyFee: "Monthly Fee",
          class: "Class",
          advanced: "Advanced Options",
          batchTime: "Batch Time",
          batchTimePlaceholder: "e.g. 8:00 AM - 10:00 AM",
          duration: "Course Duration",
          durationPlaceholder: "e.g. 6 months, 1 year",
          subjects: "Subjects",
          subjectsPlaceholder: "Type subject and press Enter",
          add: "Add",
          weeklyDays: "Weekly Days"
        }
      },
      marketing: {
        title: "Marketing Tools",
        subtitle: "Grow your coaching center with high-quality branded visuals.",
        qrPoster: {
          title: "Smart QR Poster",
          desc: "Generate a beautiful poster for your front desk to manage admissions and fee inquiries via QR code.",
          generate: "Generate Poster",
          scanToEnroll: "Scan to Enroll",
          scanForFees: "Scan for Fee Status"
        },
        leaderboard: {
          title: "Leaderboard Posters",
          desc: "Celebrate your top performers and share them on social media.",
          generate: "Generate Leaderboard"
        },
        social: {
          shareReady: "Ready to Share",
          download: "Download PNG",
          facebookAutoPost: "Direct Posting Note: Facebook requires institutional app verification. Use 'Ready to Share' images for the best organic reach.",
          credit: "Proudly managed by Manage My Batch"
        },
        successStory: {
          title: "Success Story Generator",
          desc: "Highlight a student's achievement in a beautiful, branded square graphic.",
          generate: "Create Success Story",
          selectStudent: "Select Student",
          selectExam: "Select Exam (Optional)"
        },
        birthday: {
          title: "Birthday Card Designer",
          desc: "Generate branded birthday wishes for your students to share on WhatsApp status.",
          generate: "Design Birthday Card"
        },
        badges: {
          title: "Achievement Badges",
          desc: "Unlock and share digital badges for attendance, behavior, or high scores.",
          generate: "Unlock New Badge"
        }
      },
      fees: {
        title: "Fee Management",
        subtitle: "Track payments, manage dues, and financial records.",
        totalCollected: "Total Collected",
        allStudents: "All Students",
        dueList: "Due List",
        searchPlaceholder: "Search by name, roll, or phone...",
        allBatches: "All Batches",
        daily: "Daily",
        monthly: "Monthly",
        custom: "Custom",
        table: {
          studentInfo: "Student Info",
          batch: "Batch",
          monthlyFee: "Monthly Fee",
          status: "Status",
          pendingMonths: "Pending Months",
          actions: "Actions"
        },
        status: {
          paid: "Paid",
          duesPending: "Dues Pending",
          allClear: "All clear ✨"
        },
        collectFee: "Collect Fee",
        paymentModal: {
          title: "Collect Monthly Fee",
          selectMonths: "Select Months to Pay",
          paymentMethod: "Payment Method",
          cash: "Cash",
          bkash: "bKash",
          bkashNumber: "bKash Number",
          transactionId: "Transaction ID",
          totalAmount: "Total Amount",
          confirm: "Confirm & Send Message"
        },
        reportModal: {
          title: "Custom Date Range Report",
          startDate: "Start Date",
          endDate: "End Date",
          download: "Download Custom Report"
        },
        whatsapp: {
          success: "Payment successful!",
          studentName: "Student Name",
          month: "Month",
          totalAmount: "Total Amount",
          method: "Payment Method",
          thanks: "Thanks, Manage My Batch."
        }
      },
      offlineExams: {
        title: "Exam Management",
        subtitle: "Create and manage single or school-wide exams.",
        createNew: "Create New Exam",
        tabs: {
          active: "Active Exams",
          archive: "Archive"
        },
        searchPlaceholder: "Search exams...",
        card: {
          single: "Single Exam",
          school: "School Exam",
          subjects: "Subjects",
          manage: "Manage Exam",
          edit: "Edit Exam",
          delete: "Delete Exam"
        },
        modal: {
          createTitle: "Create New Exam",
          editTitle: "Edit Exam",
          type: "Exam Type",
          types: {
            single: "Single Exam (Coaching)",
            school: "School Exam (Term/Final)"
          },
          institution: "Institution Name",
          examTitle: "Exam Title",
          selectBatch: "Select Batch",
          examDate: "Exam Date",
          totalMarks: "Total Marks",
          subjectsAndMarks: "Subjects & Marks",
          addSubject: "Add Subject",
          subjectName: "Subject Name",
          marks: "Marks",
          date: "Date",
          submitCreate: "Create Exam",
          submitUpdate: "Update Exam"
        },
        manage: {
          tabs: {
            overview: "Overview",
            seatPlan: "Seat Plan",
            admitCards: "Admit Cards",
            results: "Results"
          },
          overview: {
            schedule: "Exam Schedule",
            downloadSchedule: "Download Schedule"
          },
          seatPlan: {
            title: "Seat Plan",
            download: "Download Seat Plan"
          },
          admitCards: {
            title: "Admit Cards",
            style: "Card Style",
            color: "Theme Color",
            downloadAll: "Download All",
            downloadIndividual: "Download"
          },
          results: {
            title: "Result Entry",
            save: "Save Results",
            success: "Results saved successfully! Exam has been moved to archive."
          }
        }
      },
      attendance: {
        title: "Attendance Tracker",
        subtitle: "Mark and track student presence for today.",
        date: "Date",
        saveAttendance: "Save Attendance",
        searchPlaceholder: "Search student...",
        table: {
          student: "Student",
          rollNo: "Roll No",
          grade: "Grade",
          status: "Status",
          actions: "Quick Actions"
        },
        status: {
          present: "Present",
          absent: "Absent",
          late: "Late",
          notMarked: "Not marked"
        },
        success: "Attendance saved successfully!",
        pendingSubmissions: "Pending Submissions ({{count}})",
        pending: "Pending",
        approve: "Approve",
        back: "Back",
        manualRegisterDesc: "Register attendance manually.",
        searchBatchPlaceholder: "Search by group name...",
        students: "Students",
        manualAttendance: "Manual Attendance",
        createLink: "Create Attendance Link",
        linkModalTitle: "Public Attendance Link",
        linkCreated: "Link Created!",
        linkShareDesc: "Copy this link and share it with the respective teacher.",
        linkCopied: "Link copied to clipboard!",
        linkNotice: "When the teacher submits attendance via this link, it will appear as 'Pending' on your dashboard. It will be updated once you verify and save it.",
        close: "Close",
        successTitle: "Success!",
        ok: "OK"
      },
      public: {
        attendance: {
          thanks: "Thank You!",
          successMsg: "Today's attendance has been successfully submitted. The admin will verify and save it.",
          date: "Date",
          instruction: "Please confirm student attendance and click the save button below.",
          student: "Student",
          roll: "Roll",
          status: "Status",
          save: "Save Attendance"
        },
        examResult: {
          highestMark: "Highest Mark",
          totalStudents: "Total Students",
          passRate: "Pass Rate",
          searchPlaceholder: "Search result by name or roll...",
          rank: "Rank",
          student: "Student",
          roll: "Roll",
          marks: "Marks",
          grade: "Grade"
        }
      },
      nav: {
        dashboard: "Dashboard",
        students: "Students",
        batches: "Batches",
        fees: "Fees",
        attendance: "Attendance",
        offlineExams: "Offline Exams",
        institution: "Institution",
        teachers: "Teachers",
        settings: "Settings",
        messages: "Messages",
        marketing: "Marketing",
        logout: "Logout"
      },
      login: {
        title: "Empowering Education with <1>Smart Management.</1>",
        subtitle: "The all-in-one platform for modern schools to manage students, track finances, and streamline administrative tasks.",
        smartManagement: "Smart Management",
        smartManagementDesc: "Efficient student & batch tracking.",
        secureData: "Secure Data",
        secureDataDesc: "Enterprise-grade security rules.",
        realTime: "Real-time",
        realTimeDesc: "Instant updates across all devices.",
        cloudNative: "Cloud Native",
        cloudNativeDesc: "Access your school from anywhere.",
        welcomeBack: "Welcome Back",
        signInSubtitle: "Sign in to access your institution dashboard.",
        continueWithGoogle: "Continue with Google",
        or: "or",
        email: "Email Address",
        password: "Password",
        signIn: "Sign In",
        noAccount: "Don't have an account?",
        contactAdmin: "Contact Administrator",
        stats: {
          students: "Students",
          schools: "Schools",
          uptime: "Uptime"
        }
      },
      common: {
        loading: "Loading...",
        back: "Back",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        search: "Search",
        success: "Success",
        ok: "OK",
        done: "Done",
        sendWhatsApp: "Send WhatsApp",
        roles: {
          admin: "Administrator",
          teacher: "Teacher"
        },
        more: "More",
        months: {
          January: "January",
          February: "February",
          March: "March",
          April: "April",
          May: "May",
          June: "June",
          July: "July",
          August: "August",
          September: "September",
          October: "October",
          November: "November",
          December: "December"
        },
        grades: {
          "Class 1": "Class 1",
          "Class 2": "Class 2",
          "Class 3": "Class 3",
          "Class 4": "Class 4",
          "Class 5": "Class 5",
          "Class 6": "Class 6",
          "Class 7": "Class 7",
          "Class 8": "Class 8",
          "Class 9": "Class 9",
          "Class 10": "Class 10",
          "Class 11": "Class 11",
          "Class 12": "Class 12",
          "No class": "No class"
        },
        weekDays: {
          Sun: "Sun",
          Mon: "Mon",
          Tue: "Tue",
          Wed: "Wed",
          Thu: "Thu",
          Fri: "Fri",
          Sat: "Sat"
        }
      },
      settings: {
        title: "Account Settings",
        subtitle: "Manage your profile, preferences, and security.",
        tabs: {
          profile: "Profile Information",
          notifications: "Notifications",
          security: "Security & Privacy",
          language: "Language & Region",
          appearance: "Appearance",
          staff: "Staff & Employee"
        },
        profile: {
          changePhoto: "Change Photo",
          verified: "Verified",
          fullName: "Full Name",
          email: "Email Address",
          phone: "Phone Number",
          institution: "Institution",
          save: "Save Changes",
          cancel: "Cancel"
        },
        dangerZone: {
          title: "Danger Zone",
          description: "Once you delete your account, there is no going back. Please be certain.",
          delete: "Delete Account"
        }
      },
      institution: {
        title: "Institution Management",
        subtitle: "Manage your coaching profile, admission forms, and applications.",
        tabs: {
          profile: "Coaching Profile",
          admissionForm: "Admission Form",
          applications: "Applications"
        },
        profile: {
          title: "Coaching Profile",
          shareLink: "Share Profile Link",
          downloadBio: "Download Bio",
          established: "Established",
          stats: {
            students: "Total Students",
            teachers: "Total Teachers",
            batches: "Total Batches"
          },
          info: {
            name: "Coaching Name",
            address: "Address",
            phone: "Contact Phone",
            email: "Contact Email",
            description: "About Institution",
            vision: "Vision & Mission"
          }
        },
        admission: {
          title: "Admission Form Setup",
          shareLink: "Share Admission Link",
          formTitle: "Form Title",
          instructions: "Instructions for Students",
          fields: "Required Fields",
          active: "Form is Active"
        },
        applications: {
          title: "Received Applications",
          admit: "Admit Student",
          view: "View Details",
          noApplications: "No applications received yet."
        }
      },
      teachers: {
        title: "Teacher & Staff Management",
        subtitle: "Manage your faculty, schedules, and recruitment.",
        tabs: {
          list: "Staff List",
          schedules: "Schedules",
          hiring: "Hire Teacher"
        },
        list: {
          addTeacher: "Add Teacher",
          salary: "Monthly Salary",
          paymentStatus: "Payment Status",
          paid: "Paid",
          unpaid: "Unpaid",
          markAsPaid: "Mark as Paid"
        },
        schedules: {
          title: "Class Schedules",
          download: "Download Schedule",
          addSchedule: "Add Class Slot"
        },
        hiring: {
          title: "Teacher Recruitment",
          createCircular: "Create Job Circular",
          circulars: "Active Circulars",
          applications: "Job Applications",
          requirements: "Requirements",
          apply: "Apply Now",
          shareLink: "Share Circular Link",
          vacancies: "Number of People Needed",
          salaryRange: "Salary Range",
          deadline: "Deadline",
          education: "Required Education Status",
          experience: "Exp. Needed",
          description: "Job Description"
        }
      },
      studentProfile: {
        tabs: {
          overview: "OVERVIEW",
          payments: "PAYMENTS",
          contact: "CONTACT"
        },
        stats: {
          totalPaid: "Total Paid",
          monthsPaid: "Months Paid",
          monthlyFee: "Monthly Fee"
        },
        info: {
          personal: "Personal Information",
          guardian: "Guardian Information",
          academic: "Academic Information",
          fatherName: "Father's Name",
          motherName: "Mother's Name",
          dob: "Date of Birth",
          birthCert: "Birth Certificate",
          nid: "NID Number",
          address: "Address",
          guardianName: "Guardian Name",
          guardianPhone: "Phone Number",
          batch: "Batch",
          grade: "Grade",
          section: "Section",
          rollNo: "Roll No",
          joinDate: "Join Date",
          feeType: "Fee Type"
      }
    },
    messages: {
      title: "Messaging Center",
      subtitle: "Send broadcast or individual messages to students, teachers, and applicants.",
      credits: "SMS Tokens",
      available: "Available",
      sentThisMonth: "{{count}} sent this month",
      buyTokens: "Buy Tokens",
      newMessage: "New Message",
      history: "Message History",
      send: "Send Message",
      sending: "Sending...",
      recipientType: "Recipient Group",
      selectBatch: "Select Batch",
      selectStudent: "Select Student",
      selectTeacher: "Select Teacher",
      selectApplicant: "Select Applicant",
      messageContent: "Message Content",
      placeholder: "Type your message here...",
      status: {
        delivered: "Delivered",
        failed: "Failed"
      },
      types: {
        batch: "Batch",
        group: "Group",
        individual: "Individual Student",
        teacher: "Teacher",
        applicant: "Job Applicant"
      },
      success: "Message sent successfully!",
      error: {
        noCredits: "Insufficient credits. Please buy more tokens.",
        failed: "Failed to send message. Please try again."
      }
    },
    help: {
      title: "How can we help you?",
      subtitle: "Find answers to common questions or get in touch with our support team for instant assistance.",
      searchPlaceholder: "Search for your issue...",
      faqTitle: "Frequently Asked Questions",
      contactTitle: "Contact Support",
      noResults: "No results found for \"{{query}}\"",
      instantHelp: "Need Instant Help?",
      instantHelpDesc: "Our support team is available 24/7 to resolve your issues. Click the button below to start a direct chat.",
      startChat: "Start Direct Chat",
      faqs: {
        q1: "How do I create a new batch?",
        a1: "Go to the 'Batches' section from the sidebar and click on the 'Create Batch' button. Fill in the details like name, grade, and fees, then save.",
        q2: "How can I collect student fees?",
        a2: "Navigate to the 'Fees' section, search for the student, and click 'Collect Fee'. You can select multiple months and choose the payment method (Cash or bKash).",
        q3: "Can I send SMS notifications to parents?",
        a3: "Yes, you can send SMS notifications from the 'Messages' section. You'll need SMS tokens, which can be purchased by contacting support or clicking 'Buy Tokens' on the dashboard.",
        q4: "How do I take attendance?",
        a4: "Go to the 'Attendance' section, select the batch and date, then mark each student as Present, Absent, or Late. Don't forget to click 'Save Attendance'.",
        q5: "What happens when my subscription expires?",
        a5: "Your account will automatically revert to the 'Free' plan. You will still have access to your data, but certain limits on student and batch counts will apply."
      }
    }
  }
},
bn: {
    translation: {
      dashboard: {
        title: "ড্যাশবোর্ড",
        search: "অনুসন্ধান...",
        dueNotice: "বকেয়া ফি নোটিশ",
        dueNoticeDesc: "বর্তমানে <1>{{count}} জন</1> ছাত্রের মাসিক ফি বকেয়া আছে। দ্রুত ব্যবস্থা নিন।",
        viewDueList: "Due List দেখুন",
        startBatchTitle: "ব্যাচ তৈরি করুন",
        startBatchDesc: "ছাত্র যোগ করতে ও ফি পরিচালনা করতে প্রথমে একটি ব্যাচ তৈরি করুন।",
        createBatch: "ব্যাচ তৈরি করুন",
        stats: {
          totalStudents: "মোট ছাত্র",
          batches: "ব্যাচ",
          offlineExams: "অফলাইন পরীক্ষা",
          pendingResults: "অপেক্ষমান ফলাফল",
          attendanceRate: "উপস্থিতির হার",
          totalCollected: "মোট সংগৃহীত",
          studentsWithDues: "বকেয়া ছাত্র"
        },
        quickActions: {
          takeAttendance: "উপস্থিতি নিন",
          takeAttendanceDesc: "দৈনিক উপস্থিতি রেকর্ড করুন",
          offlineExams: "অফলাইন পরীক্ষা",
          offlineExamsDesc: "পরীক্ষার ফলাফল পরিচালনা করুন",
          feeManagement: "ফি ব্যবস্থাপনা",
          feeManagementDesc: "পেমেন্ট ট্র্যাক করুন",
          students: "ছাত্র",
          studentsDesc: "ছাত্র পরিচালনা করুন"
        },
        recentExams: "সাম্প্রতিক অফলাইন পরীক্ষা",
        recentAttendance: "সাম্প্রতিক উপস্থিতি",
        viewAll: "সব দেখুন",
        noExams: "এখনও কোনো অফলাইন পরীক্ষা নেই",
        noAttendance: "এখনও কোনো উপস্থিতির রেকর্ড নেই",
        buyTokens: "টোকেন কিনুন",
        smsTokens: "এসএমএস টোকেন",
        sentThisMonth: "এই মাসে {{count}}টি পাঠানো হয়েছে",
        available: "উপলব্ধ"
      },
      students: {
        title: "ছাত্র তালিকা",
        subtitle: "আপনার প্রতিষ্ঠানের সকল ছাত্রদের পরিচালনা এবং দেখুন।",
        export: "এক্সপোর্ট",
        addStudent: "ছাত্র যোগ করুন",
        allStudents: "সকল ছাত্র",
        applications: "আবেদনসমূহ",
        searchPlaceholder: "নাম বা রোল নম্বর দিয়ে খুঁজুন...",
        filter: "ফিল্টার",
        allGrades: "সব গ্রেড",
        table: {
          student: "ছাত্র",
          whatsapp: "হোয়াটসঅ্যাপ",
          batchGrade: "ব্যাচ এবং গ্রেড",
          rollNo: "রোল নম্বর",
          contact: "যোগাযোগ",
          status: "অবস্থা",
          date: "তারিখ",
          actions: "অ্যাকশন"
        },
        addModal: {
          title: "নতুন ছাত্র যোগ করুন",
          photo: "ছাত্রের ছবি",
          photoDesc: "আপলোড করতে ক্লিক করুন (সর্বোচ্চ ৫০০কেবি) অথবা নিচে ইউআরএল দিন",
          photoPlaceholder: "অথবা এখানে ছবির ইউআরএল দিন...",
          name: "ছাত্রের নাম",
          rollNo: "রোল নম্বর",
          dob: "জন্ম তারিখ",
          birthCert: "জন্ম নিবন্ধন নম্বর",
          nid: "এনআইডি নম্বর",
          fatherName: "পিতার নাম",
          motherName: "মাতার নাম",
          guardianPhone: "ফোন নম্বর",
          joinDate: "ভর্তির তারিখ",
          batch: "ব্যাচ",
          admissionFee: "ভর্তি ফি",
          monthlyFee: "মাসিক ফি",
          subjectGroup: "বিষয় গ্রুপ",
          feeType: "ডিফল্ট ফি টাইপ",
          address: "বিস্তারিত ঠিকানা",
          addressPlaceholder: "সম্পূর্ণ ঠিকানা লিখুন...",
          skipAdmissionFee: "ভর্তি ফি পরিশোধ করা হয়েছে",
          skipMonthlyFee: "চলতি মাসের ফি পরিশোধ করা হয়েছে",
          successMsg: "অভিনন্দন! {{name}} এর ভর্তি সফল হয়েছে।\nভর্তি ফি: ৳{{aFee}}\nমাসিক ফি: ৳{{mFee}}\nমোট গ্রহণ করা হয়েছে: ৳{{total}}\nধন্যবাদ, Manage My Batch।",
        },
        importInstructions: {
          title: "ইমপোর্ট নির্দেশিকা",
          description: "একসাথে অনেক ছাত্র যোগ করতে সঠিক হেডার সহ একটি সিএসভি ফাইল ব্যবহার করুন। নির্ভুলতা নিশ্চিত করতে আপনি নিচের টেমপ্লেটটি ডাউনলোড করতে পারেন।",
          requiredColumns: "প্রয়োজনীয় কলাম (CSV হেডার):",
          downloadTemplate: "সিএসভি টেমপ্লেট ডাউনলোড করুন",
          nameDesc: "ছাত্রের পুরো নাম",
          phoneDesc: "১১ সংখ্যার মোবাইল নম্বর",
          batchDesc: "সঠিক ব্যাচের নাম (আপনার বিদ্যমান ব্যাচের সাথে মিলতে হবে)",
          rollDesc: "ছাত্রের রোল বা আইডি নম্বর"
        }
      },
      batches: {
        title: "ব্যাচসমূহ",
        subtitle: "উন্নত ব্যবস্থাপনার জন্য ছাত্রদের গ্রুপে সংগঠিত করুন।",
        addBatch: "ব্যাচ যোগ করুন",
        createBatch: "ব্যাচ তৈরি করুন",
        searchPlaceholder: "ব্যাচ খুঁজুন...",
        filter: "ফিল্টার",
        viewDetails: "বিস্তারিত দেখুন",
        created: "তৈরি করা হয়েছে",
        month: "মাস",
        table: {
          name: "ব্যাচের নাম",
          grade: "গ্রেড",
          students: "ছাত্র সংখ্যা",
          fees: "ফি (ভর্তি/মাসিক)",
          actions: "অ্যাকশন"
        },
        addModal: {
          title: "নতুন ব্যাচ যোগ করুন",
          name: "ব্যাচের নাম",
          namePlaceholder: "যেমন: Turbo 2025-1, সকাল ব্যাচ",
          description: "বিবরণ",
          descriptionPlaceholder: "সংক্ষিপ্ত বিবরণ",
          color: "রং",
          admissionFee: "ভর্তি ফি",
          monthlyFee: "মাসিক ফি",
          class: "ক্লাস",
          advanced: "অ্যাডভান্সড অপশন",
          batchTime: "ব্যাচের সময়",
          batchTimePlaceholder: "যেমন: সকাল ৮:০০ - ১০:০০",
          duration: "কোর্সের মেয়াদ",
          durationPlaceholder: "যেমন: ৬ মাস, ১ বছর",
          subjects: "বিষয়সমূহ",
          subjectsPlaceholder: "নতুন বিষয় লিখুন ও Enter চাপুন",
          add: "যোগ করুন",
          weeklyDays: "সাপ্তাহিক দিন"
        }
      },
      marketing: {
        title: "মার্কেটিং টুলস",
        subtitle: "উন্নত মানের ব্র্যান্ডেড ভিজ্যুয়াল দিয়ে আপনার কোচিং সেন্টার বড় করুন।",
        qrPoster: {
          title: "স্মার্ট কিউআর পোস্টার",
          desc: "কিউআর কোডের মাধ্যমে ভর্তি এবং ফি সংক্রান্ত তথ্য পরিচালনা করতে একটি সুন্দর পোস্টার তৈরি করুন।",
          generate: "পোস্টার তৈরি করুন",
          scanToEnroll: "ভর্তির জন্য স্ক্যান করুন",
          scanForFees: "ফি তথ্যের জন্য স্ক্যান করুন"
        },
        leaderboard: {
          title: "লিডারবোর্ড পোস্টার",
          desc: "সেরা পারফর্মারদের সেলিব্রেট করুন এবং সোশ্যাল মিডিয়ায় শেয়ার করুন।",
          generate: "লিডারবোর্ড তৈরি করুন"
        },
        social: {
          shareReady: "শেয়ার করার জন্য প্রস্তুত",
          download: "PNG ডাউনলোড করুন",
          facebookAutoPost: "সরাসরি পোস্টিং নোট: ফেসবুকের জন্য প্রাতিষ্ঠানিক অ্যাপ ভেরিফিকেশন প্রয়োজন। সেরা অর্গানিক রিচের জন্য 'শেয়ার করার জন্য প্রস্তুত' ইমেজগুলো ব্যবহার করুন।",
          credit: "Manage My Batch দ্বারা পরিচালিত"
        },
        successStory: {
          title: "সাফল্যের গল্প জেনারেটর",
          desc: "একটি সুন্দর ব্রান্ডেড গ্রাফিক্সে ছাত্রের কৃতিত্ব তুলে ধরুন।",
          generate: "সাফল্যের গল্প তৈরি করুন",
          selectStudent: "ছাত্র নির্বাচন করুন",
          selectExam: "পরীক্ষা নির্বাচন করুন (ঐচ্ছিক)"
        },
        birthday: {
          title: "জন্মদিনের কার্ড ডিজাইনার",
          desc: "ছাত্রদের জন্য ব্রান্ডেড জন্মদিনের শুভেচ্ছা তৈরি করুন যা তারা হোয়াটসঅ্যাপে শেয়ার করবে।",
          generate: "জন্মদিনের কার্ড ডিজাইন"
        },
        badges: {
          title: "সাফল্যের ব্যাজ",
          desc: "উপস্থিতি, আচরণ বা উচ্চ স্কোরের জন্য ডিজিটাল ব্যাজ আনলক এবং শেয়ার করুন।",
          generate: "নতুন ব্যাজ আনলক করুন"
        }
      },
      fees: {
        title: "ফি ব্যবস্থাপনা",
        subtitle: "পেমেন্ট ট্র্যাক করুন, বকেয়া পরিচালনা করুন এবং আর্থিক রেকর্ড রাখুন।",
        totalCollected: "মোট সংগৃহীত",
        allStudents: "সকল ছাত্র",
        dueList: "বকেয়া তালিকা",
        searchPlaceholder: "নাম, রোল বা ফোন দিয়ে খুঁজুন...",
        allBatches: "সকল ব্যাচ",
        daily: "দৈনিক",
        monthly: "মাসিক",
        custom: "কাস্টম",
        table: {
          studentInfo: "ছাত্রের তথ্য",
          batch: "ব্যাচ",
          monthlyFee: "মাসিক ফি",
          status: "অবস্থা",
          pendingMonths: "বকেয়া মাস",
          actions: "অ্যাকশন"
        },
        status: {
          paid: "পরিশোধিত",
          duesPending: "বকেয়া আছে",
          allClear: "সব পরিষ্কার ✨"
        },
        collectFee: "ফি সংগ্রহ করুন",
        paymentModal: {
          title: "মাসিক ফি সংগ্রহ করুন",
          selectMonths: "পরিশোধের মাস নির্বাচন করুন",
          paymentMethod: "পেমেন্ট পদ্ধতি",
          cash: "নগদ (Cash)",
          bkash: "বিকাশ (bKash)",
          bkashNumber: "বিকাশ নম্বর",
          transactionId: "ট্রানজেকশন আইডি",
          totalAmount: "মোট পরিমাণ",
          confirm: "নিশ্চিত করুন এবং মেসেজ পাঠান"
        },
        reportModal: {
          title: "কাস্টম তারিখ রিপোর্ট",
          startDate: "শুরু তারিখ",
          endDate: "শেষ তারিখ",
          download: "কাস্টম রিপোর্ট ডাউনলোড করুন"
        },
        whatsapp: {
          success: "পেমেন্ট সফল হয়েছে!",
          studentName: "ছাত্রের নাম",
          month: "মাস",
          totalAmount: "মোট টাকা",
          method: "পেমেন্ট পদ্ধতি",
          thanks: "ধন্যবাদ, Manage My Batch।"
        }
      },
      offlineExams: {
        title: "পরীক্ষা ব্যবস্থাপনা",
        subtitle: "একক বা স্কুল-ব্যাপী পরীক্ষা তৈরি এবং পরিচালনা করুন।",
        createNew: "নতুন পরীক্ষা তৈরি করুন",
        tabs: {
          active: "সক্রিয় পরীক্ষা",
          archive: "আর্কাইভ"
        },
        searchPlaceholder: "পরীক্ষা খুঁজুন...",
        card: {
          single: "একক পরীক্ষা",
          school: "স্কুল পরীক্ষা",
          subjects: "বিষয়",
          manage: "পরীক্ষা পরিচালনা",
          edit: "পরীক্ষা সম্পাদনা",
          delete: "পরীক্ষা মুছুন"
        },
        modal: {
          createTitle: "নতুন পরীক্ষা তৈরি করুন",
          editTitle: "পরীক্ষা সম্পাদনা করুন",
          type: "পরীক্ষার ধরন",
          types: {
            single: "একক পরীক্ষা (কোচিং)",
            school: "স্কুল পরীক্ষা (টার্ম/ফাইনাল)"
          },
          institution: "প্রতিষ্ঠানের নাম",
          examTitle: "পরীক্ষার শিরোনাম",
          selectBatch: "ব্যাচ নির্বাচন করুন",
          examDate: "পরীক্ষার তারিখ",
          totalMarks: "মোট নম্বর",
          subjectsAndMarks: "বিষয় এবং নম্বর",
          addSubject: "বিষয় যোগ করুন",
          subjectName: "বিষয়ের নাম",
          marks: "নম্বর",
          date: "তারিখ",
          submitCreate: "পরীক্ষা তৈরি করুন",
          submitUpdate: "পরীক্ষা আপডেট করুন"
        },
        manage: {
          tabs: {
            overview: "ওভারভিউ",
            seatPlan: "সিট প্ল্যান",
            admitCards: "অ্যাডমিট কার্ড",
            results: "ফলাফল"
          },
          overview: {
            schedule: "পরীক্ষার সময়সূচী",
            downloadSchedule: "সময়সূচী ডাউনলোড করুন"
          },
          seatPlan: {
            title: "সিট প্ল্যান",
            download: "সিট প্ল্যান ডাউনলোড করুন"
          },
          admitCards: {
            title: "অ্যাডমিট কার্ড",
            style: "কার্ড স্টাইল",
            color: "থিম কালার",
            downloadAll: "সব ডাউনলোড করুন",
            downloadIndividual: "ডাউনলোড"
          },
          results: {
            title: "ফলাফল এন্ট্রি",
            save: "ফলাফল সংরক্ষণ করুন",
            success: "ফলাফল সফলভাবে সংরক্ষণ করা হয়েছে! পরীক্ষাটি আর্কাইভে সরানো হয়েছে।"
          }
        }
      },
      attendance: {
        title: "উপস্থিতি ট্র্যাকার",
        subtitle: "আজকের জন্য ছাত্রদের উপস্থিতি রেকর্ড এবং ট্র্যাক করুন।",
        date: "তারিখ",
        saveAttendance: "উপস্থিতি সংরক্ষণ করুন",
        searchPlaceholder: "ছাত্র খুঁজুন...",
        table: {
          student: "ছাত্র",
          rollNo: "রোল নম্বর",
          grade: "গ্রেড",
          status: "অবস্থা",
          actions: "অ্যাকশন"
        },
        status: {
          present: "উপস্থিত",
          absent: "অনুপস্থিত",
          late: "দেরি",
          notMarked: "রেকর্ড করা হয়নি"
        },
        success: "উপস্থিতি সফলভাবে সংরক্ষণ করা হয়েছে!",
        pendingSubmissions: "যাচাইয়ের জন্য পেন্ডিং হাজিরা ({{count}})",
        pending: "পেন্ডিং",
        approve: "সেভ করুন",
        back: "ফিরে যান",
        manualRegisterDesc: "ম্যানুয়ালি হাজিরা রেজিস্টার করুন।",
        searchBatchPlaceholder: "গ্রুপের নাম দিয়ে খুঁজুন...",
        students: "ছাত্র",
        manualAttendance: "ম্যানুয়াল হাজিরা",
        createLink: "হাজিরা লিঙ্ক তৈরি করুন",
        linkModalTitle: "পাবলিক হাজিরা লিঙ্ক",
        linkCreated: "লিঙ্ক তৈরি হয়েছে!",
        linkShareDesc: "এই লিঙ্কটি কপি করে সংশ্লিষ্ট শিক্ষকের সাথে শেয়ার করুন।",
        linkCopied: "লিঙ্ক কপি করা হয়েছে!",
        linkNotice: "শিক্ষক এই লিঙ্কে গিয়ে হাজিরা দিলে তা আপনার ড্যাশবোর্ডে \"পেন্ডিং\" হিসেবে জমা হবে। আপনি যাচাই করে সেভ করলেই তা আপডেট হবে।",
        close: "বন্ধ করুন",
        successTitle: "সফল হয়েছে!",
        ok: "ঠিক আছে"
      },
      public: {
        attendance: {
          thanks: "ধন্যবাদ!",
          successMsg: "আজকের হাজিরা সফলভাবে জমা দেওয়া হয়েছে। এডমিন এটি যাচাই করে সেভ করবেন।",
          date: "তারিখ",
          instruction: "অনুগ্রহ করে শিক্ষার্থীদের হাজিরা নিশ্চিত করুন এবং নিচে সেভ বাটনে ক্লিক করুন।",
          student: "শিক্ষার্থী",
          roll: "রোল",
          status: "অবস্থা",
          save: "হাজিরা সেভ করুন"
        },
        examResult: {
          highestMark: "সর্বোচ্চ নম্বর",
          totalStudents: "মোট শিক্ষার্থী",
          passRate: "পাস হার",
          searchPlaceholder: "নাম বা রোল দিয়ে রেজাল্ট খুঁজুন...",
          rank: "র‍্যাঙ্ক",
          student: "শিক্ষার্থী",
          roll: "রোল",
          marks: "নম্বর",
          grade: "গ্রেড"
        }
      },
      nav: {
        dashboard: "ড্যাশবোর্ড",
        students: "ছাত্র",
        batches: "ব্যাচ",
        fees: "ফি",
        attendance: "উপস্থিতি",
        offlineExams: "অফলাইন পরীক্ষা",
        institution: "প্রতিষ্ঠান",
        teachers: "শিক্ষক",
        settings: "সেটিংস",
        messages: "মেসেজ",
        marketing: "মার্কেটিং",
        logout: "লগআউট"
      },
      login: {
        title: "শিক্ষাকে শক্তিশালী করুন <1>AI বুদ্ধিমত্তার সাথে।</1>",
        subtitle: "আধুনিক স্কুলগুলোর জন্য ছাত্র পরিচালনা, অর্থ ট্র্যাক করা এবং AI-চালিত মূল্যায়ন তৈরির অল-ইন-ওয়ান প্ল্যাটফর্ম।",
        aiPowered: "AI চালিত",
        aiPoweredDesc: "স্মার্ট কুইজ জেনারেশন এবং অ্যানালিটিক্স।",
        secureData: "নিরাপদ ডাটা",
        secureDataDesc: "এন্টারপ্রাইজ-গ্রেড সিকিউরিটি রুলস।",
        realTime: "রিয়েল-টাইম",
        realTimeDesc: "সব ডিভাইসে তাৎক্ষণিক আপডেট।",
        cloudNative: "ক্লাউড নেটিভ",
        cloudNativeDesc: "যেকোনো জায়গা থেকে আপনার স্কুল অ্যাক্সেস করুন।",
        welcomeBack: "স্বাগতম",
        signInSubtitle: "আপনার প্রতিষ্ঠানের ড্যাশবোর্ড অ্যাক্সেস করতে সাইন ইন করুন।",
        continueWithGoogle: "গুগল দিয়ে চালিয়ে যান",
        or: "অথবা",
        email: "ইমেইল ঠিকানা",
        password: "পাসওয়ার্ড",
        signIn: "সাইন ইন",
        noAccount: "অ্যাকাউন্ট নেই?",
        contactAdmin: "অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন",
        stats: {
          students: "ছাত্র",
          schools: "স্কুল",
          uptime: "আপটাইম"
        }
      },
      common: {
        loading: "লোড হচ্ছে...",
        back: "পিছনে",
        save: "সংরক্ষণ করুন",
        cancel: "বাতিল করুন",
        delete: "মুছে ফেলুন",
        edit: "সম্পাদনা করুন",
        add: "যোগ করুন",
        search: "অনুসন্ধান",
        success: "সফল",
        ok: "ঠিক আছে",
        done: "শেষ",
        sendWhatsApp: "হোয়াটসঅ্যাপ পাঠান",
        roles: {
          admin: "অ্যাডমিনিস্ট্রেটর",
          teacher: "শিক্ষক"
        },
        more: "আরও",
        months: {
          January: "জানুয়ারি",
          February: "ফেব্রুয়ারি",
          March: "মার্চ",
          April: "এপ্রিল",
          May: "মে",
          June: "জুন",
          July: "জুলাই",
          August: "আগস্ট",
          September: "সেপ্টেম্বর",
          October: "অক্টোবর",
          November: "নভেম্বর",
          December: "ডিসেম্বর"
        },
        grades: {
          "Class 1": "প্রথম শ্রেণী",
          "Class 2": "দ্বিতীয় শ্রেণী",
          "Class 3": "তৃতীয় শ্রেণী",
          "Class 4": "চতুর্থ শ্রেণী",
          "Class 5": "পঞ্চম শ্রেণী",
          "Class 6": "ষষ্ঠ শ্রেণী",
          "Class 7": "সপ্তম শ্রেণী",
          "Class 8": "অষ্টম শ্রেণী",
          "Class 9": "নবম শ্রেণী",
          "Class 10": "দশম শ্রেণী",
          "Class 11": "একাদশ শ্রেণী",
          "Class 12": "দ্বাদশ শ্রেণী",
          "No class": "কোন শ্রেণী নেই"
        },
        weekDays: {
          Sun: "রবি",
          Mon: "সোম",
          Tue: "মঙ্গল",
          Wed: "বুধ",
          Thu: "বৃহস্পতি",
          Fri: "শুক্র",
          Sat: "শনি"
        }
      },
      settings: {
        title: "অ্যাকাউন্ট সেটিংস",
        subtitle: "আপনার প্রোফাইল, পছন্দ এবং নিরাপত্তা পরিচালনা করুন।",
        tabs: {
          profile: "প্রোফাইল তথ্য",
          notifications: "নোটিফিকেশন",
          security: "নিরাপত্তা এবং গোপনীয়তা",
          language: "ভাষা এবং অঞ্চল",
          appearance: "চেহারা",
          staff: "স্টাফ এবং কর্মচারী"
        },
        profile: {
          changePhoto: "ছবি পরিবর্তন করুন",
          verified: "ভেরিফাইড",
          fullName: "পুরো নাম",
          email: "ইমেইল ঠিকানা",
          phone: "ফোন নম্বর",
          institution: "প্রতিষ্ঠান",
          save: "পরিবর্তন সংরক্ষণ করুন",
          cancel: "বাতিল করুন"
        },
        dangerZone: {
          title: "বিপজ্জনক অঞ্চল",
          description: "একবার আপনি আপনার অ্যাকাউন্ট মুছে ফেললে, আর ফিরে আসা সম্ভব নয়। দয়া করে নিশ্চিত হন।",
          delete: "অ্যাকাউন্ট মুছে ফেলুন"
        }
      },
      institution: {
        title: "প্রতিষ্ঠান ব্যবস্থাপনা",
        subtitle: "আপনার কোচিং প্রোফাইল, ভর্তি ফরম এবং আবেদনগুলি পরিচালনা করুন।",
        tabs: {
          profile: "কোচিং প্রোফাইল",
          admissionForm: "ভর্তি ফরম",
          applications: "আবেদনসমূহ"
        },
        profile: {
          title: "কোচিং প্রোফাইল",
          shareLink: "প্রোফাইল লিঙ্ক শেয়ার করুন",
          downloadBio: "বায়ো ডাউনলোড করুন",
          established: "প্রতিষ্ঠিত",
          stats: {
            students: "মোট ছাত্র",
            teachers: "মোট শিক্ষক",
            batches: "মোট ব্যাচ"
          },
          info: {
            name: "কোচিংয়ের নাম",
            address: "ঠিকানা",
            phone: "যোগাযোগের ফোন",
            email: "যোগাযোগের ইমেইল",
            description: "প্রতিষ্ঠান সম্পর্কে",
            vision: "ভিশন ও মিশন"
          }
        },
        admission: {
          title: "ভর্তি ফরম সেটআপ",
          shareLink: "ভর্তি লিঙ্ক শেয়ার করুন",
          formTitle: "ফরমের শিরোনাম",
          instructions: "ছাত্রদের জন্য নির্দেশাবলী",
          fields: "প্রয়োজনীয় ক্ষেত্র",
          active: "ফরমটি সক্রিয় আছে"
        },
        applications: {
          title: "প্রাপ্ত আবেদনসমূহ",
          admit: "ছাত্র ভর্তি করুন",
          view: "বিস্তারিত দেখুন",
          noApplications: "এখনও কোনো আবেদন পাওয়া যায়নি।"
        }
      },
      teachers: {
        title: "শিক্ষক ও স্টাফ ব্যবস্থাপনা",
        subtitle: "আপনার শিক্ষক, সময়সূচী এবং নিয়োগ পরিচালনা করুন।",
        tabs: {
          list: "স্টাফ তালিকা",
          schedules: "সময়সূচী",
          hiring: "শিক্ষক নিয়োগ"
        },
        list: {
          addTeacher: "শিক্ষক যোগ করুন",
          salary: "মাসিক বেতন",
          paymentStatus: "পেমেন্ট স্ট্যাটাস",
          paid: "পরিশোধিত",
          unpaid: "বকেয়া",
          markAsPaid: "পরিশোধিত হিসেবে চিহ্নিত করুন"
        },
        schedules: {
          title: "ক্লাস সময়সূচী",
          download: "সময়সূচী ডাউনলোড করুন",
          addSchedule: "ক্লাস স্লট যোগ করুন"
        },
        hiring: {
          title: "শিক্ষক নিয়োগ",
          createCircular: "জব সার্কুলার তৈরি করুন",
          circulars: "সক্রিয় সার্কুলার",
          applications: "চাকরির আবেদন",
          requirements: "প্রয়োজনীয়তা",
          apply: "এখনই আবেদন করুন",
          shareLink: "সার্কুলার লিঙ্ক শেয়ার করুন"
        }
      },
      quiz: {
        title: "কুইজ জেনারেটর",
        subtitle: "আপনার শিক্ষার্থীদের জন্য AI-চালিত কুইজ তৈরি করুন",
        topic: "কুইজ বিষয়",
        topicPlaceholder: "যেমন: সালোকসংশ্লেষণ, বীজগণিত, দ্বিতীয় বিশ্বযুদ্ধ",
        grade: "গ্রেড লেভেল",
        count: "প্রশ্নের সংখ্যা",
        generate: "কুইজ তৈরি করুন",
        generating: "তৈরি হচ্ছে...",
        error: {
          topicRequired: "দয়া করে একটি বিষয় লিখুন",
          failed: "কুইজ তৈরি করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
          general: "কুইজ তৈরি করার সময় একটি ত্রুটি ঘটেছে।"
        },
        preview: {
          title: "কুইজ প্রিভিউ",
          save: "কুইজ সংরক্ষণ করুন",
          download: "PDF ডাউনলোড করুন",
          regenerate: "আবার তৈরি করুন",
          correctAnswer: "সঠিক উত্তর",
          questions: "প্রশ্ন"
        }
      },
      studentProfile: {
        tabs: {
          overview: "ওভারভিউ",
          payments: "পেমেন্ট",
          contact: "যোগাযোগ"
        },
        stats: {
          totalPaid: "মোট পরিশোধিত",
          monthsPaid: "পরিশোধিত মাস",
          monthlyFee: "মাসিক ফি"
        },
        info: {
          personal: "ব্যক্তিগত তথ্য",
          guardian: "অভিভাবকের তথ্য",
          academic: "একাডেমিক তথ্য",
          fatherName: "পিতার নাম",
          motherName: "মাতার নাম",
          dob: "জন্ম তারিখ",
          birthCert: "জন্ম নিবন্ধন",
          nid: "NID নম্বর",
          address: "ঠিকানা",
          guardianName: "অভিভাবকের নাম",
          guardianPhone: "ফোন নম্বর",
          batch: "ব্যাচ",
          grade: "শ্রেণী",
          section: "সেকশন",
          rollNo: "রোল নম্বর",
          joinDate: "যোগদানের তারিখ",
          feeType: "ফি ধরণ"
      }
    },
    messages: {
      title: "মেসেজিং সেন্টার",
      subtitle: "ছাত্র, শিক্ষক এবং আবেদনকারীদের ব্রডকাস্ট বা ব্যক্তিগত মেসেজ পাঠান।",
      credits: "এসএমএস টোকেন",
      available: "উপলব্ধ",
      sentThisMonth: "এই মাসে {{count}}টি পাঠানো হয়েছে",
      buyTokens: "টোকেন কিনুন",
      newMessage: "নতুন মেসেজ",
      history: "মেসেজ হিস্ট্রি",
      send: "মেসেজ পাঠান",
      sending: "পাঠানো হচ্ছে...",
      recipientType: "প্রাপক গ্রুপ",
      selectBatch: "ব্যাচ নির্বাচন করুন",
      selectStudent: "ছাত্র নির্বাচন করুন",
      selectTeacher: "শিক্ষক নির্বাচন করুন",
      selectApplicant: "আবেদনকারী নির্বাচন করুন",
      messageContent: "মেসেজের বিষয়বস্তু",
      placeholder: "আপনার মেসেজ এখানে লিখুন...",
      status: {
        delivered: "ডেলিভারড",
        failed: "ব্যর্থ"
      },
      types: {
        batch: "ব্যাচ",
        group: "গ্রুপ",
        individual: "ব্যক্তিগত ছাত্র",
        teacher: "শিক্ষক",
        applicant: "চাকরির আবেদনকারী"
      },
      success: "মেসেজ সফলভাবে পাঠানো হয়েছে!",
      error: {
        noCredits: "পর্যাপ্ত ক্রেডিট নেই। অনুগ্রহ করে আরও টোকেন কিনুন।",
        failed: "মেসেজ পাঠাতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"
      }
    },
    help: {
      title: "আমরা আপনাকে কীভাবে সাহায্য করতে পারি?",
      subtitle: "সাধারণ প্রশ্নের উত্তর খুঁজুন অথবা তাৎক্ষণিক সহায়তার জন্য আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      searchPlaceholder: "আপনার সমস্যাটি খুঁজুন...",
      faqTitle: "সচরাচর জিজ্ঞাসিত প্রশ্নাবলী",
      contactTitle: "সাপোর্ট টিমের সাথে যোগাযোগ",
      noResults: "\"{{query}}\" এর জন্য কোনো ফলাফল পাওয়া যায়নি",
      instantHelp: "তাৎক্ষণিক সাহায্য প্রয়োজন?",
      instantHelpDesc: "আমাদের সাপোর্ট টিম আপনার সমস্যা সমাধানের জন্য ২৪/৭ উপলব্ধ। সরাসরি চ্যাট শুরু করতে নিচের বাটনে ক্লিক করুন।",
      startChat: "সরাসরি চ্যাট শুরু করুন",
      faqs: {
        q1: "আমি কীভাবে একটি নতুন ব্যাচ তৈরি করব?",
        a1: "সাইডবার থেকে 'ব্যাচ' সেকশনে যান এবং 'ব্যাচ তৈরি করুন' বাটনে ক্লিক করুন। নাম, গ্রেড এবং ফি-এর মতো বিবরণ পূরণ করুন এবং সেভ করুন।",
        q2: "আমি কীভাবে ছাত্রের ফি সংগ্রহ করতে পারি?",
        a2: "ফি সেকশনে যান, ছাত্রের নাম খুঁজুন এবং 'ফি সংগ্রহ করুন' বাটনে ক্লিক করুন। আপনি একাধিক মাস নির্বাচন করতে পারেন এবং পেমেন্ট পদ্ধতি (নগদ বা বিকাশ) বেছে নিতে পারেন।",
        q3: "আমি কি অভিভাবকদের কাছে এসএমএস নোটিফিকেশন পাঠাতে পারি?",
        a3: "হ্যাঁ, আপনি 'মেসেজ' সেকশন থেকে এসএমএস নোটিফিকেশন পাঠাতে পারেন। আপনার এসএমএস টোকেন প্রয়োজন হবে, যা ড্যাশবোর্ড থেকে 'টোকেন কিনুন' বাটনে ক্লিক করে সংগ্রহ করা যাবে।",
        q4: "আমি কীভাবে উপস্থিতি নেব?",
        a4: "উপস্থিতি সেকশনে যান, ব্যাচ এবং তারিখ নির্বাচন করুন, তারপর প্রতিটি ছাত্রকে উপস্থিত, অনুপস্থিত বা দেরি হিসেবে চিহ্নিত করুন। 'উপস্থিতি সংরক্ষণ করুন' বাটনে ক্লিক করতে ভুলবেন না।",
        q5: "আমার সাবস্ক্রিপশন শেষ হয়ে গেলে কী হবে?",
        a5: "আপনার অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে 'ফ্রি' প্ল্যানে ফিরে যাবে। আপনি তখনও আপনার ডাটা অ্যাক্সেস করতে পারবেন, তবে ছাত্র এবং ব্যাচ সংখ্যার ওপর নির্দিষ্ট সীমাবদ্ধতা প্রযোজ্য হবে।"
      }
    }
  }
}
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
