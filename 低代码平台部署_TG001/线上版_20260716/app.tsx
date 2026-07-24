import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/HomePage/HomePage';
import AssessmentPage from './pages/AssessmentPage/AssessmentPage';
import AssessmentResultPage from './pages/AssessmentResultPage/AssessmentResultPage';
import CoursesPage from './pages/CoursesPage/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage/CourseDetailPage';
import CoachingPage from './pages/CoachingPage/CoachingPage';
import CoachingChatPage from './pages/CoachingChatPage/CoachingChatPage';
import ExpertPanelPage from './pages/ExpertPanelPage/ExpertPanelPage';
import ExpertReviewPage from './pages/ExpertReviewPage/ExpertReviewPage';
import OptimizationCenterPage from './pages/OptimizationCenterPage/OptimizationCenterPage';
import ExpertDashboardPage from './pages/ExpertDashboardPage/ExpertDashboardPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import Level3EvalPage from './pages/Level3EvalPage/Level3EvalPage';
import Level4EvalPage from './pages/Level4EvalPage/Level4EvalPage';
import BusinessImpactPage from './pages/BusinessImpactPage/BusinessImpactPage';
import ActionPlanPage from './pages/ActionPlanPage/ActionPlanPage';
import AdminLoginPage from './pages/AdminLoginPage/AdminLoginPage';
import ExpertJourneyReportPage from './pages/ExpertJourneyReportPage/ExpertJourneyReportPage';
import SystemDataPage from './pages/SystemDataPage/SystemDataPage';
import QuestionLibraryPage from './pages/QuestionLibraryPage/QuestionLibraryPage';
import AudioProcessingPage from './pages/AudioProcessingPage/AudioProcessingPage';
import CoursewareManagePage from './pages/CoursewareManagePage/CoursewareManagePage';
import ContentReviewPage from './pages/ContentReviewPage/ContentReviewPage';
import PracticePage from './pages/PracticePage/PracticePage';
import FeedbackPage from './pages/FeedbackPage/FeedbackPage';
import AdminStudentDataPage from './pages/AdminStudentDataPage/AdminStudentDataPage';
import AdminCoachingManagePage from './pages/AdminCoachingManagePage/AdminCoachingManagePage';
import DevelopmentHistoryPage from './pages/DevelopmentHistoryPage/DevelopmentHistoryPage';
import TestRunPage from './pages/TestRunPage/TestRunPage';
import PR2PreparePage from './pages/coaching/pr2-prepare/PR2PreparePage';
import PR2TransitionPage from './pages/coaching/pr2-transition/PR2TransitionPage';
import PR2ChatPage from './pages/coaching/pr2-chat/PR2ChatPage';
import PR2FeedbackPage from './pages/coaching/pr2-feedback/PR2FeedbackPage';
import TeamMotivationPreparePage from './pages/coaching/team-motivation/TeamMotivationPreparePage/TeamMotivationPreparePage';
import TeamMotivationPlayPage from './pages/coaching/team-motivation/TeamMotivationPlayPage/TeamMotivationPlayPage';
import TeamMotivationFeedbackPage from './pages/coaching/team-motivation/TeamMotivationFeedbackPage/TeamMotivationFeedbackPage';
import ScenarioGeneratorPage from './pages/ScenarioGeneratorPage/ScenarioGeneratorPage';
import CapabilityTestPage from './pages/CapabilityTestPage/CapabilityTestPage';
import ScenarioGeneratePage from './pages/ScenarioGeneratePage/ScenarioGeneratePage';
import ScenarioTransitionPage from './pages/ScenarioTransitionPage/ScenarioTransitionPage';
import ScenarioChatPage from './pages/ScenarioChatPage/ScenarioChatPage';
import ScenarioFeedbackPage from './pages/ScenarioFeedbackPage/ScenarioFeedbackPage';
import TG001PreparePage from './pages/TG001/TG001PreparePage';
import TG001EnginePage from './pages/TG001/TG001EnginePage';
import TG001FeedbackPage from './pages/TG001/TG001FeedbackPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/assessment-result" element={<AssessmentResultPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/coaching" element={<CoachingPage />} />
        <Route path="/coaching/:sceneId" element={<CoachingChatPage />} />
        <Route path="/coaching/pr2-prepare" element={<PR2PreparePage />} />
        <Route path="/coaching/pr2-transition/:sessionId" element={<PR2TransitionPage />} />
        <Route path="/coaching/pr2-chat/:sessionId" element={<PR2ChatPage />} />
        <Route path="/coaching/pr2-feedback/:sessionId" element={<PR2FeedbackPage />} />
        <Route path="/coaching/team-motivation/:sceneId" element={<TeamMotivationPreparePage />} />
        <Route path="/coaching/team-motivation/play/:sessionId" element={<TeamMotivationPlayPage />} />
        <Route path="/coaching/team-motivation/feedback/:sessionId" element={<TeamMotivationFeedbackPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/feedback/:userId" element={<FeedbackPage />} />
        <Route path="/expert-panel" element={<ExpertPanelPage />} />
        <Route path="/expert-review" element={<ExpertReviewPage />} />
        <Route path="/optimization" element={<OptimizationCenterPage />} />
        <Route path="/expert-dashboard" element={<ExpertDashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/level3-eval" element={<Level3EvalPage />} />
        <Route path="/level4-eval" element={<Level4EvalPage />} />
        <Route path="/business-impact" element={<BusinessImpactPage />} />
        <Route path="/action-plan" element={<ActionPlanPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/expert-journey-report" element={<ExpertJourneyReportPage />} />
        <Route path="/system-data" element={<SystemDataPage />} />
        <Route path="/admin/question-library" element={<QuestionLibraryPage />} />
        <Route path="/admin/audio-processing" element={<AudioProcessingPage />} />
        <Route path="/admin/courseware" element={<CoursewareManagePage />} />
        <Route path="/admin/content-review" element={<ContentReviewPage />} />
        <Route path="/admin/student-data" element={<AdminStudentDataPage />} />
        <Route path="/admin/coaching-manage" element={<AdminCoachingManagePage />} />
        <Route path="/development-history" element={<DevelopmentHistoryPage />} />
        <Route path="/test-run" element={<TestRunPage />} />
        <Route path="/admin/scenario-generator" element={<ScenarioGeneratorPage />} />
        <Route path="/capability-test" element={<CapabilityTestPage />} />
        <Route path="/scenario/generate" element={<ScenarioGeneratePage />} />
        <Route path="/scenario/:sceneId/transition" element={<ScenarioTransitionPage />} />
        <Route path="/scenario/:sceneId/chat" element={<ScenarioChatPage />} />
        <Route path="/scenario/:sceneId/feedback" element={<ScenarioFeedbackPage />} />
        <Route path="/test-run/:sceneId" element={<TestRunPage />} />
        <Route path="/tg001/prepare" element={<TG001PreparePage />} />
        <Route path="/tg001/engine/:sessionId" element={<TG001EnginePage />} />
        <Route path="/tg001/feedback/:sessionId" element={<TG001FeedbackPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
