const loadTestimonials = () => {
  const savedTestimonials = localStorage.getItem('testimonials');
  return savedTestimonials ? JSON.parse(savedTestimonials) : [];
};

export const testimonials = loadTestimonials();

export const addTestimonial = (testimonial) => {
  testimonials.unshift(testimonial);
  localStorage.setItem('testimonials', JSON.stringify(testimonials));
  return testimonial;
};

export const deleteTestimonial = (id) => {
  const index = testimonials.findIndex(t => t.id === id);
  if (index !== -1) {
    testimonials.splice(index, 1);
    localStorage.setItem('testimonials', JSON.stringify(testimonials));
    return true;
  }
  return false;
};
